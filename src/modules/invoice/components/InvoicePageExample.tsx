import { Component } from 'solid-js';
import { EnhancedInvoiceAddForm } from './EnhancedInvoiceAddForm';

// Example page component showing how to use the enhanced invoice form
export const InvoicePageExample: Component = () => {
  return (
    <div class="min-h-screen bg-gray-100">
      <div class="py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900">Invoice Management</h1>
            <p class="mt-2 text-sm text-gray-600">
              Create invoices with dynamic pricing, bag management, and automatic arancel calculations
            </p>
          </div>
          
          {/* Enhanced Invoice Form */}
          <EnhancedInvoiceAddForm />
          
          {/* Additional Information */}
          <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature: Dynamic Pricing */}
            <div class="bg-white p-6 rounded-lg shadow">
              <h3 class="text-lg font-semibold text-gray-800 mb-2">
                Dynamic Pricing
              </h3>
              <p class="text-sm text-gray-600">
                Prices automatically adjust based on weight ranges and shipping type (Sea or Air).
              </p>
              <ul class="mt-3 text-sm text-gray-500 space-y-1">
                <li>• Sea: $0.75-$1.50/lb</li>
                <li>• Air: $2.00-$3.50/lb</li>
                <li>• Volume discounts applied</li>
              </ul>
            </div>
            
            {/* Feature: Bag Management */}
            <div class="bg-white p-6 rounded-lg shadow">
              <h3 class="text-lg font-semibold text-gray-800 mb-2">
                Bag Grouping
              </h3>
              <p class="text-sm text-gray-600">
                Group reservas into bags for efficient transport and tracking.
              </p>
              <ul class="mt-3 text-sm text-gray-500 space-y-1">
                <li>• $5 transport cost per bag</li>
                <li>• Track weight per bag</li>
                <li>• Organize shipments</li>
              </ul>
            </div>
            
            {/* Feature: Arancel Calculation */}
            <div class="bg-white p-6 rounded-lg shadow">
              <h3 class="text-lg font-semibold text-gray-800 mb-2">
                Smart Arancel
              </h3>
              <p class="text-sm text-gray-600">
                Automatic customs duty calculation with exemptions.
              </p>
              <ul class="mt-3 text-sm text-gray-500 space-y-1">
                <li>• Weight-based rates (5-12%)</li>
                <li>• Exempt: Documents, Medicines</li>
                <li>• Auto-calculated totals</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};