import { Component } from 'solid-js';
import { Layout } from '../modules/ui';
import { YabaOffersManager } from '../modules/invoice/components';

const YabaOffersPage: Component = () => {
  return (
    <Layout title="Ofertas YABA">
      <YabaOffersManager />
    </Layout>
  );
};

export default YabaOffersPage;
