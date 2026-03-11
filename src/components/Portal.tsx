import { Component, JSX, onMount, onCleanup } from 'solid-js';
import { render } from 'solid-js/web';

interface PortalProps {
  children: JSX.Element;
  mount?: HTMLElement;
}

/**
 * Portal component renders children in a different part of the DOM tree
 * This is useful for modals, tooltips, and other UI elements that need to break out of their normal stacking context
 */
const Portal: Component<PortalProps> = (props) => {
  let dispose: () => void;
  
  const mount = () => props.mount ?? document.body;
  
  onMount(() => {
    const container = document.createElement('div');
    mount().appendChild(container);
    
    dispose = render(() => props.children, container);
    
    onCleanup(() => {
      dispose?.();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
  });
  
  return null;
};

export default Portal;