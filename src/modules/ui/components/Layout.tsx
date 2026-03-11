import { Component, JSX } from 'solid-js';
import LanguageSelector from './LanguageSelector';

interface LayoutProps {
  children: JSX.Element;
  title?: string;
}

const Layout: Component<LayoutProps> = (props) => {
  const mainStyle = {
    'min-height': '100vh',
    background: 'var(--background-color)'
  };

  const containerStyle = {
    'max-width': '1440px',
    margin: '0 auto',
    padding: '2rem'
  };

  const headerStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '2rem'
  };

  const titleStyle = {
    'font-size': '2rem',
    'font-weight': '700',
    color: 'var(--text-primary)',
    margin: '0'
  };

  return (
    <main style={mainStyle}>
      <div style={containerStyle}>
        {props.title && (
          <header style={headerStyle}>
            <h1 style={titleStyle}>{props.title}</h1>
           
          </header>
        )}
        {props.children}
      </div>
    </main>
  );
};

export default Layout;