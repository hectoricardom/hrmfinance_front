import { createMemo, Component, JSX } from 'solid-js';
import { getIcon } from '../stores/iconStore';

export interface IconProps {
  name: string;
  size?: string | number;
  color?: string;
  class?: string;
  style?: JSX.CSSProperties;
  onClick?: () => void;
  title?: string;
}

const Icon: Component<IconProps> = (props) => {
  const iconDefinition = createMemo(() => getIcon(props.name));
  
  const sizeValue = createMemo(() => {
    if (typeof props.size === 'number') {
      return `${props.size}px`;
    }
    return props.size || '1em';
  });

  const iconStyle = createMemo(() => ({
    width: sizeValue(),
    height: sizeValue(),
    display: 'inline-block',
    color: props.color || 'currentColor',
    cursor: props.onClick ? 'pointer' : 'default',
    ...props.style
  }));

  return (
    <span
      class={`icon ${props.class || ''}`}
      style={iconStyle()}
      onClick={props.onClick}
      title={props.title || props.name}
      innerHTML={iconDefinition()?.svg || `<svg viewBox="0 0 ${ sizeValue()} ${ sizeValue()}" fill=${props.color || 'currentColor'}><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 8C13.1 8 14 8.9 14 10V20C14 21.1 13.1 22 12 22S10 21.1 10 20V10C10 8.9 10.9 8 12 8Z"/></svg>`}
    />
  );
};

export default Icon;