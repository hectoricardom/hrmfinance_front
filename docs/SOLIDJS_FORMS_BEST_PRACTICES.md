# SolidJS Forms Best Practices

## The Input Re-rendering Problem

When using `For` loops with form inputs in SolidJS, you may encounter an issue where typing causes the entire component to re-render on each keystroke, making inputs lose focus and only allowing one character at a time.

### ❌ Problem Example:
```tsx
<For each={items()}>
  {(item) => (
    <div>
      <FormInput 
        value={item.name}
        onChange={(val) => {
          // This causes re-render of entire For loop
          setItems(prev => prev.map(i => i.id === item.id ? {...i, name: val} : i));
        }}
      />
    </div>
  )}
</For>
```

## ✅ Solutions

### Solution 1: Extract Components
Create separate components for complex list items:

```tsx
// Separate component file: LineItem.tsx
const LineItem: Component<{item: Item, onUpdate: Function}> = (props) => {
  const memoizedOptions = createMemo(() => computeExpensiveOptions());
  
  return (
    <FormInput 
      value={props.item.value}
      onChange={(val) => props.onUpdate(props.item.id, 'field', val)}
    />
  );
};

// In parent component:
<For each={items()} fallback={<div>No items</div>}>
  {(item) => <LineItem item={item} onUpdate={updateItem} />}
</For>
```

### Solution 2: Stable Update Functions
Use stable update functions that don't recreate on each render:

```tsx
const updateItem = (id: string, field: string, value: any) => {
  setItems(prev => prev.map(item => 
    item.id === id ? { ...item, [field]: value } : item
  ));
};

<For each={items()}>
  {(item) => (
    <FormInput 
      value={item.name}
      onChange={(val) => updateItem(item.id, 'name', val)}
    />
  )}
</For>
```

### Solution 3: Use createMemo for Expensive Operations
Memoize expensive computations:

```tsx
const LineItem: Component<Props> = (props) => {
  // ✅ Memoized - only recalculates when accounts change
  const accountOptions = createMemo(() => 
    accounts.map(acc => ({ value: acc.id, label: acc.name }))
  );

  return (
    <FormSelect 
      options={accountOptions()} 
      onChange={(val) => props.onUpdate(props.item.id, val)}
    />
  );
};
```

## Best Practices Checklist

### ✅ DO:
- Always provide `fallback` prop to `For` components
- Extract complex list items into separate components
- Use stable keys/IDs for list items (tempId, id, etc.)
- Memoize expensive computations with `createMemo()`
- Use stable update functions that don't recreate on each render
- Keep update logic simple and focused

### ❌ DON'T:
- Use complex inline JSX inside `For` loops with many form fields
- Create new functions inside render functions
- Recreate expensive computations on every render
- Use array indices as keys when items can be reordered
- Forget to provide fallback content

## Real-World Examples

### Journal Entry Lines (Fixed)
```tsx
// ✅ GOOD - Extracted component
const JournalLineItem: Component<Props> = (props) => {
  const accountOptions = createMemo(() => getAccountOptions());
  
  return (
    <div style={props.style}>
      <FormSelect
        value={props.line.accountId}
        onChange={(val) => props.onUpdate(props.line.tempId, 'accountId', val)}
        options={accountOptions()}
      />
      <FormInput
        value={props.line.description}
        onChange={(val) => props.onUpdate(props.line.tempId, 'description', val)}
      />
    </div>
  );
};

// In parent:
<For each={lines()} fallback={<div>No lines</div>}>
  {(line) => (
    <JournalLineItem
      line={line}
      onUpdate={updateLine}
      style={lineStyle}
    />
  )}
</For>
```

### Template Management (Fixed)
```tsx
// ✅ GOOD - Extracted component with disabled state
const TemplateLineItem: Component<Props> = (props) => {
  return (
    <div style={props.style}>
      <FormSelect
        value={props.line.accountId}
        onChange={(val) => props.onUpdate(props.index, 'accountId', val)}
        disabled={props.disabled}
      />
      <FormInput
        value={props.line.description}
        onChange={(val) => props.onUpdate(props.index, 'description', val)}
        disabled={props.disabled}
      />
    </div>
  );
};
```

## Common Anti-Patterns to Avoid

### 1. Recreating Options on Every Render
```tsx
// ❌ BAD
<For each={items()}>
  {(item) => (
    <FormSelect 
      options={accounts.map(acc => ({value: acc.id, label: acc.name}))}
    />
  )}
</For>

// ✅ GOOD  
const accountOptions = createMemo(() => 
  accounts.map(acc => ({value: acc.id, label: acc.name}))
);

<For each={items()}>
  {(item) => <FormSelect options={accountOptions()} />}
</For>
```

### 2. Complex Inline Update Logic
```tsx
// ❌ BAD
<FormInput 
  onChange={(val) => {
    const parsed = parseFloat(val) || 0;
    setItems(prev => prev.map(item => {
      if (item.id === currentItem.id) {
        const updated = { ...item, amount: parsed };
        if (parsed > 0) {
          updated.otherField = 0;
        }
        return updated;
      }
      return item;
    }));
  }}
/>

// ✅ GOOD
const handleAmountChange = (id: string, value: string) => {
  const parsed = parseFloat(value) || 0;
  updateItem(id, 'amount', parsed);
  if (parsed > 0) {
    updateItem(id, 'otherField', 0);
  }
};

<FormInput onChange={(val) => handleAmountChange(item.id, val)} />
```

## Performance Tips

1. **Use `createMemo()` for expensive computations**
2. **Extract components to separate files when they become complex**
3. **Always provide stable keys for list items**
4. **Avoid recreating functions inside render methods**
5. **Use `fallback` props to prevent empty state re-renders**

## Debugging Re-render Issues

If you're still experiencing re-render issues:

1. Check if you're using stable keys for list items
2. Verify that update functions aren't being recreated
3. Look for expensive computations that should be memoized
4. Consider extracting complex items into separate components
5. Use SolidJS DevTools to identify unnecessary re-renders

## Migration Strategy

When fixing existing components:

1. **Identify the problem**: Look for `For` loops with complex inline JSX
2. **Extract components**: Move complex list items to separate components
3. **Add fallbacks**: Always provide fallback content
4. **Memoize expensive operations**: Use `createMemo()` for costly computations
5. **Test thoroughly**: Ensure typing works smoothly without losing focus

This approach ensures smooth user experience and better performance in your SolidJS applications.