import { Component, JSX, For as SolidFor } from 'solid-js';

/**
 * OptimizedFor - A wrapper around SolidJS For that prevents re-rendering issues in forms
 * 
 * This component helps prevent the common issue where typing in input fields inside a For loop
 * causes the entire component to re-render on each keystroke, making the input lose focus.
 * 
 * Usage:
 * ```tsx
 * <OptimizedFor each={items()}>
 *   {(item, index) => <YourComponent item={item} index={index} />}
 * </OptimizedFor>
 * ```
 */

interface OptimizedForProps<T> {
  each: readonly T[];
  children: (item: T, index: () => number) => JSX.Element;
  fallback?: JSX.Element;
}

export function OptimizedFor<T>(props: OptimizedForProps<T>): JSX.Element {
  return (
    <SolidFor 
      each={props.each} 
      fallback={props.fallback || <div style={{ display: 'none' }}>Loading...</div>}
    >
      {props.children}
    </SolidFor>
  );
}

/**
 * Best Practices for Forms with Dynamic Lists:
 * 
 * 1. ALWAYS use stable keys/IDs for list items (tempId, id, etc.)
 * 2. Extract complex list items into separate components
 * 3. Use memoized computations for expensive operations
 * 4. Provide fallback content for empty lists
 * 5. Avoid inline functions in onChange handlers when possible
 * 
 * Example structure:
 * 
 * ```tsx
 * // ✅ GOOD - Separate component
 * const LineItem: Component<{item: Item, onUpdate: Function}> = (props) => {
 *   const memoizedOptions = createMemo(() => computeExpensiveOptions());
 *   
 *   return (
 *     <FormInput 
 *       value={props.item.value}
 *       onChange={(val) => props.onUpdate(props.item.id, 'field', val)}
 *     />
 *   );
 * };
 * 
 * // In parent component:
 * <OptimizedFor each={items()}>
 *   {(item) => <LineItem item={item} onUpdate={updateItem} />}
 * </OptimizedFor>
 * 
 * // ❌ BAD - Inline complex JSX
 * <For each={items()}>
 *   {(item) => (
 *     <div>
 *       <FormInput onChange={(val) => {
 *         // Complex logic here causes re-renders
 *         setItems(prev => prev.map(i => i.id === item.id ? {...i, field: val} : i));
 *       }} />
 *     </div>
 *   )}
 * </For>
 * ```
 */

export default OptimizedFor;