/**
 * DrakeExportPage
 * Page wrapper component for the Drake Tax Export module
 */

import { Component } from 'solid-js';
import DrakeExportDashboard from '../components/DrakeExportDashboard';
import { useTranslation } from '../../../translations';

const DrakeExportPage: Component = () => {
  // Translation hook available for future internationalization
  const { t } = useTranslation();

  // Page container styles
  const pageContainerStyle = {
    width: '100%',
    height: '100%',
    'min-height': '100vh',
    background: 'var(--background-color, #f5f5f5)',
  };

  return (
    <div style={pageContainerStyle}>
      <DrakeExportDashboard />
    </div>
  );
};

export default DrakeExportPage;
