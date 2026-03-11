import { Component } from 'solid-js';
import ConsigneeManagement from '../components/ConsigneeManagement';

const ConsigneePage: Component = () => {
  return (
    <div style={{
      'min-height': '100vh',
      background: 'var(--background-secondary)',
      padding: '1rem 0'
    }}>
      <ConsigneeManagement />
    </div>
  );
};

export default ConsigneePage;