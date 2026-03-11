/**
 * Delivery Manifest Component
 *
 * Displays a compact, organized delivery manifest
 * Grouped by: State → Address → Customer → Bag
 * Includes signature lines for delivery confirmation
 */

import { Component, createSignal, Show, For } from 'solid-js';
import { DeliveryManifest as ManifestData, ManifestPrintOptions } from '../types/manifestTypes';
import { generateManifest, exportManifestForPrint } from '../services/manifestService';
import { downloadManifestPDF, generateCompactManifestPDF } from '../services/manifestPdfGenerator';
import { hblStore } from '../data/hblStore';
import { devLog } from '../../../services/utils';

interface DeliveryManifestProps {
  guideNumber?: string;
}

const DeliveryManifest: Component<DeliveryManifestProps> = (props) => {
  const [manifest, setManifest] = createSignal<ManifestData | null>(null);
  const [compactMode, setCompactMode] = createSignal(true);
  const [showDetails, setShowDetails] = createSignal(false);

  const generateCurrentManifest = () => {
    const hbls = hblStore.filteredHBLs();

    if (hbls.length === 0) {
      alert('No se encontraron registros HBL. Por favor, busque registros primero.');
      return;
    }

    const newManifest = generateManifest(hbls, {
      guideNumber: props.guideNumber,
      generatedBy: 'Sistema'
    });

    setManifest(newManifest);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const current = manifest();
    if (!current) return;

    const exportData = exportManifestForPrint(current, compactMode());
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `manifest-${current.manifestId}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    const current = manifest();
    if (!current) return;

    try {
      await downloadManifestPDF(current, {
        includeDetails: showDetails(),
        includeSignature: true,
        compactMode: compactMode()
      });
    } catch (error) {
      devLog('Error generating PDF:', error);
      alert('Error al generar PDF. Por favor, intente de nuevo.');
    }
  };

  const handleDownloadCompactPDF = async () => {
    const current = manifest();
    if (!current) return;

    try {
      const doc = await generateCompactManifestPDF(current);
      doc.save(`Manifiesto-${current.manifestId}-Compacto.pdf`);
    } catch (error) {
      devLog('Error generating compact PDF:', error);
      alert('Error al generar PDF compacto. Por favor, intente de nuevo.');
    }
  };

  return (
    <div class="delivery-manifest">
      {/* Toolbar - Hidden in print */}
      <div class="manifest-toolbar no-print" style={{
        padding: '1rem',
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        'border-radius': '8px',
        'margin-bottom': '1.5rem'
      }}>
        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          'flex-wrap': 'wrap',
          'align-items': 'center'
        }}>
          <button
            onClick={generateCurrentManifest}
            style={{
              padding: '0.5rem 1rem',
              background: '#0d6efd',
              color: 'white',
              border: 'none',
              'border-radius': '4px',
              cursor: 'pointer',
              'font-weight': '500'
            }}
          >
            📋 Generar Manifiesto
          </button>

        <Show when={manifest()}>
          <button
            onClick={handlePrint}
            style={{
              padding: '0.5rem 1rem',
              background: '#198754',
              color: 'white',
              border: 'none',
              'border-radius': '4px',
              cursor: 'pointer',
              'font-weight': '500'
            }}
          >
            🖨️ Imprimir
          </button>

          <button
            onClick={handleDownloadPDF}
            style={{
              padding: '0.5rem 1rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              'border-radius': '4px',
              cursor: 'pointer',
              'font-weight': '500'
            }}
          >
            📄 Descargar PDF
          </button>

          <button
            onClick={handleDownloadCompactPDF}
            style={{
              padding: '0.5rem 1rem',
              background: '#fd7e14',
              color: 'white',
              border: 'none',
              'border-radius': '4px',
              cursor: 'pointer',
              'font-weight': '500'
            }}
          >
            📋 PDF Compacto
          </button>

          <button
            onClick={handleExport}
            style={{
              padding: '0.5rem 1rem',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              'border-radius': '4px',
              cursor: 'pointer',
              'font-weight': '500'
            }}
          >
            💾 Exportar JSON
          </button>

          <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={compactMode()}
              onChange={(e) => setCompactMode(e.currentTarget.checked)}
            />
            <span>Modo Compacto</span>
          </label>

          <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showDetails()}
              onChange={(e) => setShowDetails(e.currentTarget.checked)}
            />
            <span>Mostrar Detalles</span>
          </label>
        </Show>
        </div>
      </div>

      {/* Manifest Content */}
      <Show
        when={manifest()}
        fallback={
          <div style={{
            padding: '3rem',
            'text-align': 'center',
            color: '#6c757d',
            background: '#f8f9fa',
            'border-radius': '8px',
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📦</div>
            <h3 style={{ 'margin-bottom': '0.5rem' }}>No hay Manifiesto Generado</h3>
            <p style={{ 'margin': '0' }}>
              Busque registros HBL, luego haga clic en "Generar Manifiesto" para crear un manifiesto de entrega
            </p>
          </div>
        }
      >
        {(currentManifest) => (
          <div class="manifest-content" style={{
            background: 'white',
            padding: '2rem',
            'border-radius': '8px',
            border: '1px solid #dee2e6'
          }}>
            {/* Manifest Header */}
            <div class="manifest-header" style={{
              'border-bottom': '3px solid #0d6efd',
              'padding-bottom': '1rem',
              'margin-bottom': '1.5rem'
            }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'start' }}>
                <div>
                  <h1 style={{ margin: '0 0 0.5rem 0', 'font-size': '1.75rem' }}>
                    📦 Manifiesto de Entrega
                  </h1>
                  <div style={{ color: '#6c757d', 'font-size': '0.9rem' }}>
                    <strong>ID Manifiesto:</strong> {currentManifest().manifestId}
                  </div>
                  <Show when={currentManifest().guideNumber}>
                    <div style={{ color: '#6c757d', 'font-size': '0.9rem' }}>
                      <strong>Número de Guía:</strong> {currentManifest().guideNumber}
                    </div>
                  </Show>
                </div>
                <div style={{ 'text-align': 'right' }}>
                  <div style={{ 'font-size': '0.9rem', color: '#6c757d' }}>
                    {new Date(currentManifest().generatedAt).toLocaleString('es-ES')}
                  </div>
                  <div style={{ 'margin-top': '0.5rem', 'font-weight': 'bold' }}>
                    {currentManifest().totalAddresses} Direcciones
                  </div>
                  <div style={{ 'font-size': '0.9rem' }}>
                    {currentManifest().totalCustomers} Clientes | {currentManifest().totalItems} Artículos
                  </div>
                </div>
              </div>
            </div>

            {/* Manifest Body - Grouped by State → Address → Customer → Bag */}
            <For each={currentManifest().states}>
              {(state, stateIndex) => (
                <div class="manifest-state" style={{ 'margin-bottom': '2rem' }}>
                  {/* State Header */}
                  <div style={{
                    background: '#0d6efd',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    'border-radius': '6px',
                    'font-weight': 'bold',
                    'font-size': '1.1rem',
                    'margin-bottom': '1rem',
                    'page-break-before': stateIndex() > 0 ? 'always' : 'auto'
                  }}>
                    📍 {state.state} - {state.totalAddresses} Direcciones, {state.totalCustomers} Clientes
                  </div>

                  {/* Cities */}
                  <For each={state.cities}>
                    {(city) => (
                      <div class="manifest-city" style={{ 'margin-bottom': '1.5rem' }}>
                        {/* City Header */}
                        <div style={{
                          background: '#e7f1ff',
                          padding: '0.5rem 1rem',
                          'border-radius': '4px',
                          'font-weight': '600',
                          'font-size': '1rem',
                          'margin-bottom': '0.75rem',
                          color: '#0d6efd'
                        }}>
                          🏙️ {city.city} - {city.totalRptos} Rptos, {city.totalAddresses} Direcciones
                        </div>

                        {/* Rptos */}
                        <For each={city.rptos}>
                          {(rpto) => (
                            <div class="manifest-rpto" style={{
                              'margin-left': '1rem',
                              'margin-bottom': '1rem'
                            }}>
                              {/* Rpto Header */}
                              <div style={{
                                background: '#f8f9fa',
                                padding: '0.4rem 0.75rem',
                                'border-radius': '4px',
                                'font-weight': '500',
                                'font-size': '0.95rem',
                                'margin-bottom': '0.5rem',
                                color: '#495057'
                              }}>
                                📍 {rpto.rpto} - {rpto.totalAddresses} Direcciones, {rpto.totalCustomers} Clientes
                              </div>

                              {/* Addresses */}
                              <For each={rpto.addresses}>
                                {(address) => (
                      <div class="manifest-address" style={{
                        'margin-bottom': '1.5rem',
                        border: '1px solid #dee2e6',
                        'border-radius': '6px',
                        overflow: 'hidden'
                      }}>
                        {/* Address Header */}
                        <div style={{
                          background: '#e7f1ff',
                          padding: '0.75rem 1rem',
                          'border-bottom': '1px solid #dee2e6',
                          'font-weight': '600'
                        }}>
                          🏠 {address.fullAddress}
                          <span style={{ 'margin-left': '1rem', color: '#6c757d', 'font-weight': 'normal' }}>
                            ({address.totalCustomers} clientes, {address.totalBags} bolsas)
                          </span>
                        </div>

                        {/* Customers at this address */}
                        <div style={{ padding: '1rem' }}>
                          <For each={address.customers}>
                            {(customer, customerIndex) => (
                              <div class="manifest-customer" style={{
                                'margin-bottom': '1rem',
                                'padding-bottom': '1rem',
                                'border-bottom': customerIndex() < address.customers.length - 1
                                  ? '1px dashed #dee2e6'
                                  : 'none'
                              }}>
                                {/* Customer Info */}
                                <div style={{
                                  display: 'grid',
                                  'grid-template-columns': '160px 1fr 250px',
                                  gap: '0.5rem',
                                  'margin-bottom': '0.75rem',
                                  background: '#f8f9fa',
                                  padding: '0.5rem',
                                  'border-radius': '4px'
                                }}>
                                  <div>
                                    <strong>CID:</strong> {customer.cid}
                                  </div>
                                  <div>
                                    <strong>Nombre:</strong> {customer.consigneeName}
                                  </div>
                                  <div>
                                    <strong>Teléfono:</strong> {customer.ctelephone}
                                  </div>
                                </div>

                                {/* Bags */}
                                <div style={{ 'margin-left': '1rem' }}>
                                  <For each={customer.bags}>
                                    {(bag) => (
                                      <div class="manifest-bag" style={{
                                        'margin-bottom': '0.5rem',
                                        padding: '0.5rem',
                                        background: '#fff',
                                        border: '1px solid #e9ecef',
                                        'border-radius': '4px'
                                      }}>
                                        <div style={{
                                          display: 'flex',
                                          'justify-content': 'space-between',
                                          'align-items': 'center',
                                          'margin-bottom': '0.5rem'
                                        }}>
                                          <div>
                                            <strong>📦 Bolsa #{bag.bagNumber}</strong>
                                            <span style={{ 'margin-left': '1rem', color: '#6c757d', 'font-size': '0.9rem' }}>
                                              {bag.totalHBLs} HBLs | {bag.itemCount} artículos | {bag.totalWeight.toFixed(2)} lbs
                                            </span>
                                          </div>
                                        </div>

                                        {/* Show HBL groups */}
                                        <div style={{ 'margin-left': '1rem' }}>
                                          <For each={bag.hblGroups}>
                                            {(hblGroup) => (
                                              <div style={{
                                                'margin-bottom': '0.25rem',
                                                padding: '0.25rem 0.5rem',
                                                background: '#f8f9fa',
                                                'border-radius': '3px',
                                                'border-left': '3px solid #0d6efd'
                                              }}>
                                                <div style={{
                                                  'font-size': '0.9rem',
                                                  'font-weight': '600',
                                                  color: '#0d6efd'
                                                }}>
                                                  🏷️ {hblGroup.hbl}
                                                  <span style={{ 'margin-left': '0.5rem', color: '#6c757d', 'font-weight': 'normal', 'font-size': '0.85rem' }}>
                                                    ({hblGroup.itemCount} artículos, {hblGroup.totalWeight.toFixed(2)} lbs)
                                                  </span>
                                                </div>

                                                {/* Show individual items if details enabled */}
                                                <Show when={showDetails()}>
                                                  <div style={{ 'margin-top': '0.25rem', 'margin-left': '0.5rem' }}>
                                                    <For each={hblGroup.items}>
                                                      {(item) => (
                                                        <div style={{
                                                          'font-size': '0.8rem',
                                                          padding: '0.1rem 0',
                                                          color: '#495057'
                                                        }}>
                                                          • {item.namegood} ({item.quantity} pcs, {item.weight} lbs)
                                                        </div>
                                                      )}
                                                    </For>
                                                  </div>
                                                </Show>
                                              </div>
                                            )}
                                          </For>
                                        </div>
                                      </div>
                                    )}
                                  </For>
                                </div>

                                {/* Summary and Signature */}
                                <div style={{
                                  'margin-top': '0.75rem',
                                  display: 'grid',
                                  'grid-template-columns': '1fr auto',
                                  gap: '1rem',
                                  'align-items': 'end'
                                }}>
                                  <div style={{ 'font-size': '0.9rem', color: '#6c757d' }}>
                                    <strong>Total:</strong> {customer.totalBags} bolsas | {customer.totalItems} artículos | {customer.totalWeight.toFixed(2)} lbs
                                  </div>
                                  <div style={{ 'text-align': 'center' }}>
                                    <div style={{
                                      'border-top': '2px solid #000',
                                      padding: '0.25rem 2rem 0 2rem',
                                      'min-width': '200px',
                                      'font-size': '0.85rem',
                                      'font-weight': '500'
                                    }}>
                                      Firma
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                                )}
                              </For>
                            </div>
                          )}
                        </For>
                      </div>
                    )}
                  </For>
                </div>
              )}
            </For>

            {/* Manifest Footer - Summary */}
            <div class="manifest-footer" style={{
              'border-top': '3px solid #0d6efd',
              'padding-top': '1rem',
              'margin-top': '2rem',
              background: '#f8f9fa',
              padding: '1rem',
              'border-radius': '6px'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>📊 Resumen del Manifiesto</h3>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '1rem'
              }}>
                <div>
                  <strong>Estados:</strong> {currentManifest().totalStates}
                </div>
                <div>
                  <strong>Ciudades:</strong> {currentManifest().totalCities}
                </div>
                <div>
                  <strong>Rptos:</strong> {currentManifest().totalRptos}
                </div>
                <div>
                  <strong>Direcciones:</strong> {currentManifest().totalAddresses}
                </div>
                <div>
                  <strong>Clientes:</strong> {currentManifest().totalCustomers}
                </div>
                <div>
                  <strong>Bolsas:</strong> {currentManifest().totalBags}
                </div>
                <div>
                  <strong>Artículos:</strong> {currentManifest().totalItems}
                </div>
                <div>
                  <strong>Peso:</strong> {currentManifest().totalWeight.toFixed(2)} lbs
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }

          .manifest-content {
            border: none !important;
            padding: 0 !important;
          }

          .manifest-state {
            page-break-inside: avoid;
          }

          .manifest-customer {
            page-break-inside: avoid;
          }

          body {
            font-size: 11pt;
          }

          h1 {
            font-size: 18pt !important;
          }
        }

        .delivery-manifest {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem;
        }
      `}</style>
    </div>
  );
};

export default DeliveryManifest;
