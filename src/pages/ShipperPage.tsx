import { Component } from 'solid-js';
import ShipperManagement from '../components/ShipperManagement';

const ShipperPage: Component = () => {
  return (
    <div style={{
      'min-height': '100vh',
      background: 'var(--background-secondary)',
      padding: '1rem 0'
    }}>
      <ShipperManagement />
    </div>
  );
};

export default ShipperPage;