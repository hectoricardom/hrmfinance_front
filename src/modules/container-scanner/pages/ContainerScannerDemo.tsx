/**
 * Container Scanner Demo Page
 *
 * Demonstrates the Container Scanner component with mock data
 * Use this for testing and development without a backend
 */

import { Component, createSignal, Show } from 'solid-js';
import ContainerScanner from '../components/ContainerScanner';
import { getMockData, resetMockData } from '../services/mockContainerApi';

const ContainerScannerDemo: Component = () => {
  const [showMockData, setShowMockData] = createSignal(false);
  const [useMockApi, setUseMockApi] = createSignal(true);

  const handleResetData = () => {
    //resetMockData();
    alert('Mock data reset! Refresh the page to start over.');
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20">
      {/* Demo Header */}
      <div class="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white p-6 shadow-lg">
        <div class="max-w-2xl mx-auto">
          <div class="flex items-center justify-center gap-3 mb-2">
            <h1 class="text-2xl font-bold">Escáner de Contenedores - Modo Demo</h1>
          </div>
          <p class="text-sm text-indigo-100 font-medium text-center">Usando API simulada para pruebas</p>
        </div>
      </div>

      {/* Demo Controls */}
      <div class="max-w-2xl mx-auto p-4">
        <div class="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-6 mb-5">
          <h2 class="text-lg font-bold text-slate-900 mb-5">
            Controles de Demostración
          </h2>

          <div class="space-y-4">
            {/* Mock API Toggle */}
            <div class="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 shadow-sm">
              <div>
                <div class="font-bold text-slate-900">
                  Usar API Simulada
                </div>
                <div class="text-sm text-slate-600 font-medium mt-1">Habilitar para pruebas sin backend</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useMockApi()}
                  onChange={(e) => setUseMockApi(e.currentTarget.checked)}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
              </label>
            </div>

            {/* Show Mock Data */}
            <button
              onClick={() => setShowMockData(!showMockData())}
              class="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-3.5 px-4 rounded-lg font-semibold hover:from-slate-800 hover:to-slate-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              {showMockData() ? 'Ocultar' : 'Mostrar'} Datos de Prueba
            </button>

            {/* Reset Data */}
            <button
              onClick={handleResetData}
              class="w-full bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 py-3 px-4 rounded-lg font-semibold hover:from-slate-200 hover:to-slate-300 transition-all border-2 border-slate-300 shadow-sm hover:shadow-md"
            >
              Reiniciar Datos Simulados
            </button>
          </div>

          {/* Mock Data Display */}
          <Show when={showMockData()}>
            <div class="mt-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 shadow-inner">
              <h3 class="font-bold text-indigo-900 mb-4">
                IDs de Contenedores de Prueba:
              </h3>
              <div class="space-y-3">
                <div class="p-4 bg-white rounded-lg border-2 border-indigo-300 shadow-sm hover:shadow-md transition-shadow">
                  <div class="font-mono text-sm font-bold text-indigo-700">container-test-001</div>
                  <div class="text-xs text-slate-600 mt-2 font-medium">3 bultos: bulk-test-001, bulk-test-002, bulk-test-003</div>
                </div>
                <div class="p-4 bg-white rounded-lg border-2 border-indigo-300 shadow-sm hover:shadow-md transition-shadow">
                  <div class="font-mono text-sm font-bold text-indigo-700">container-test-002</div>
                  <div class="text-xs text-slate-600 mt-2 font-medium">2 bultos: bulk-test-004, bulk-test-005</div>
                </div>
              </div>

              <div class="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-r-lg shadow-sm">
                <div class="text-sm text-amber-900 font-medium flex items-start gap-2">
                  <span class="text-lg">💡</span>
                  <div>
                    <strong>Consejo:</strong> Copie y pegue estos IDs en el escáner para probar el flujo de trabajo
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* Instructions */}
        <div class="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-6 mb-5">
          <h2 class="text-lg font-bold text-slate-900 mb-5">
            Instrucciones de Prueba
          </h2>
          <ol class="list-decimal list-inside space-y-3 text-slate-700">
            <li class="font-medium">Habilitar el interruptor "Usar API Simulada" arriba</li>
            <li class="font-medium">Hacer clic en "Mostrar Datos de Prueba" para ver los IDs de contenedores disponibles</li>
            <li class="font-medium">Copiar un ID de contenedor (ej., <code class="bg-indigo-100 px-2.5 py-1 rounded-md text-sm font-mono text-indigo-800 font-bold">container-test-001</code>)</li>
            <li class="font-medium">Pegarlo en el escáner cuando se solicite</li>
            <li class="font-medium">Copiar y escanear cada ID de bulto mostrado en la lista</li>
            <li class="font-medium">Marcar el contenedor como recibido cuando esté completo</li>
          </ol>

          <div class="mt-6 p-5 bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50 border-2 border-indigo-300 rounded-xl shadow-inner">
            <div class="font-bold text-indigo-900 mb-3">
              Flujo de Trabajo Esperado:
            </div>
            <div class="text-sm text-indigo-800 space-y-2 font-medium">
              <div class="flex items-center gap-2 p-2 bg-white rounded-md">1️⃣ Escanear contenedor → El sistema carga los bultos</div>
              <div class="flex items-center gap-2 p-2 bg-white rounded-md">2️⃣ Escanear cada bulto → El progreso se actualiza</div>
              <div class="flex items-center gap-2 p-2 bg-white rounded-md">3️⃣ Todos los bultos escaneados → Listo para confirmar</div>
              <div class="flex items-center gap-2 p-2 bg-white rounded-md">4️⃣ Marcar como recibido → ¡Éxito!</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Component */}
      <Show when={useMockApi()}>
        <div class="border-t-4 border-gradient-to-r from-indigo-500 to-purple-500">
          <ContainerScanner />
        </div>
      </Show>

      <Show when={!useMockApi()}>
        <div class="max-w-2xl mx-auto p-4">
          <div class="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-8 text-center shadow-lg">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <span class="text-4xl">⚠️</span>
            </div>
            <div class="text-xl font-bold text-amber-900 mb-3">
              API Simulada Deshabilitada
            </div>
            <div class="text-amber-800 font-medium">
              Habilite "Usar API Simulada" arriba para probar el escáner, o configure el endpoint de la API del backend real.
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ContainerScannerDemo;
