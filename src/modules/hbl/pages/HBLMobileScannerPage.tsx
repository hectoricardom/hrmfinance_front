import { Component } from 'solid-js';
import { HBLMobileScannerSimple } from '../scanning';
import { devLog } from '../../../services/utils';

const HBLMobileScannerPage: Component = () => {
  // Handle scan completion
  const handleScanComplete = (result: any) => {
    devLog('Scan completed:', result);
    // You can add additional logic here like:
    // - Send notifications
    // - Update a dashboard
    // - Sync with server
  };

  return (
    <HBLMobileScannerSimple 
      onScanComplete={handleScanComplete}
    />
  );
};

export default HBLMobileScannerPage;