import { Component } from 'solid-js';
import { InternationalShippingForm } from '../components/InternationalShippingForm';

const InternationalShippingPage: Component = () => {
  return (
    <div class="min-h-screen bg-gray-100 py-8">
      <div class="container mx-auto">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-800">
            International Shipping Management
          </h1>
          <p class="text-gray-600 mt-2">
            Create shipping documents for Honduras, Guatemala, El Salvador, and Nicaragua with cubic feet pricing
          </p>
        </div>

        <InternationalShippingForm />

        <div class="mt-8 p-4 bg-white rounded-lg shadow">
          <h3 class="text-lg font-semibold mb-2">How it works:</h3>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>Select destination country to apply specific tariff rates</li>
            <li>Add shipment items with dimensions (height, width, depth in inches)</li>
            <li>Cubic feet are automatically calculated from dimensions (cubic inches ÷ 1,728)</li>
            <li>Price per cubic foot can be customized per item or use the default rate</li>
            <li>Tariffs are calculated automatically based on destination country</li>
            <li>Optionally add regular products to the shipment</li>
          </ul>

          <div class="mt-4 p-3 bg-blue-50 rounded">
            <h4 class="font-semibold text-sm mb-2">Country Tariff Rates:</h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>🇭🇳 Honduras: 12%</div>
              <div>🇬🇹 Guatemala: 10%</div>
              <div>🇸🇻 El Salvador: 11%</div>
              <div>🇳🇮 Nicaragua: 13%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternationalShippingPage;
