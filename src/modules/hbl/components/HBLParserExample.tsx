import { Component } from 'solid-js';
import { HBLBulkStatusUpdate } from '../status';
import { devLog } from '../../../services/utils';

/**
 * Example component showing how to use the HBL parser and bulk updater
 */
const HBLParserExample: Component = () => {
  const handleSuccess = (response: any) => {
    devLog('Update completed:', response);
    // Refresh HBL list or perform other actions
    window.location.reload(); // Simple reload, but you could refresh data more elegantly
  };

  const exampleText = `
    Here are some HBL numbers from our shipment:
    - Package 1: 230123456
    - Package 2: 230789012
    - Package 3: 230345678
    
    Also included: 230901234, 230567890
    
    Invalid examples that won't be parsed:
    - 231123456 (starts with 231)
    - 23012345 (too short)
    - 2301234567 (too long)
  `;

  return (
    <div class="max-w-4xl mx-auto p-6">
      <h1 class="text-3xl font-bold mb-6">HBL Parser & Status Updater</h1>
      
      <div class="mb-8 p-4 bg-blue-50 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">How to use:</h2>
        <ol class="list-decimal list-inside space-y-1 text-sm">
          <li>Paste any text containing HBL numbers (format: 230XXXXXX)</li>
          <li>Click "Parse HBLs" to extract all valid HBL numbers</li>
          <li>Select the new status from the dropdown</li>
          <li>Add optional notes</li>
          <li>Click "Update Statuses" to send the update request</li>
        </ol>
        
        <div class="mt-4">
          <h3 class="font-semibold mb-1">Example text:</h3>
          <pre class="text-xs bg-white p-2 rounded overflow-x-auto">{exampleText}</pre>
        </div>
      </div>

      <HBLBulkStatusUpdate onSuccess={handleSuccess} />
    </div>
  );
};

export default HBLParserExample;