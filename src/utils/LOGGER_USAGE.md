# Logger Usage Guide

A development-only logging utility that automatically prevents logs from appearing in production builds.

## 🎯 Why Use This Logger?

- ✅ **No manual cleanup**: Logs are automatically disabled in production
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Zero bundle impact**: Logs are stripped in production builds
- ✅ **Rich formatting**: Styled console output with colors and emojis
- ✅ **Performance tracking**: Built-in timing functions
- ✅ **Organized output**: Grouping and categorization features

## 📦 Basic Usage

### Import the Logger

```typescript
import { logger } from '@/utils/logger';
// or
import logger from '@/utils/logger';
```

### Basic Logging Methods

```typescript
// Standard log (only in development)
logger.log('This is a log message');
logger.log('Multiple', 'arguments', { key: 'value' });

// Warning
logger.warn('This is a warning');

// Error
logger.error('This is an error', errorObject);

// Info
logger.info('Informational message');

// Debug
logger.debug('Debug information', debugData);
```

## 🎨 Styled Logging (with Emojis & Colors)

### Pre-styled Methods

```typescript
// Success message (green with ✅)
logger.success('User created successfully!', userData);

// Failure message (red with ❌)
logger.fail('Failed to save data', error);

// Loading/Progress (yellow with ⏳)
logger.loading('Fetching data from API...');

// API calls (blue with 🌐)
logger.api('POST /api/users', requestData);

// Store/State updates (purple with 📦)
logger.store('User state updated', newState);

// Route changes (teal with 🧭)
logger.route('Navigated to /dashboard');
```

### Custom Styled Logs

```typescript
logger.styled(
  'Custom styled message',
  'color: #ff6b6b; font-size: 16px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);'
);
```

## 📊 Advanced Features

### Tables

```typescript
const users = [
  { id: 1, name: 'John', role: 'Admin' },
  { id: 2, name: 'Jane', role: 'User' }
];

logger.table(users);
logger.table(users, ['name', 'role']); // Show specific columns
```

### Grouping

```typescript
// Auto-closing group
logger.group('User Registration Flow', () => {
  logger.log('Validating email...');
  logger.log('Creating user record...');
  logger.success('User registered!');
});

// Manual group control
logger.group('Processing Items');
items.forEach(item => {
  logger.log('Processing:', item.name);
});
logger.groupEnd();

// Collapsed group (starts closed)
logger.groupCollapsed('Debug Details', () => {
  logger.log('Internal state:', state);
});
```

### Performance Measurement

```typescript
logger.time('API Call');
await fetchData();
logger.timeEnd('API Call'); // Outputs: API Call: 234.56ms

// Multiple timers
logger.time('Total Operation');
logger.time('Step 1');
await step1();
logger.timeEnd('Step 1');
logger.time('Step 2');
await step2();
logger.timeEnd('Step 2');
logger.timeEnd('Total Operation');
```

### Object Inspection

```typescript
const complexObject = {
  nested: {
    deep: {
      data: 'value'
    }
  }
};

logger.dir(complexObject, { depth: 3 });
```

### Stack Traces

```typescript
logger.trace('Show me the call stack');
```

### Conditional Logging

```typescript
logger.logIf(user.isAdmin, 'Admin user detected', user);

// Equivalent to:
if (user.isAdmin) {
  logger.log('Admin user detected', user);
}
```

### Counting

```typescript
// Count how many times this line runs
for (let i = 0; i < 5; i++) {
  logger.count('loop iteration');
}
// Output:
// loop iteration: 1
// loop iteration: 2
// loop iteration: 3
// loop iteration: 4
// loop iteration: 5

logger.countReset('loop iteration'); // Reset counter
```

### Assertions

```typescript
logger.assert(user !== null, 'User should not be null');
// Only logs if condition is false
```

## 💡 Real-World Examples

### API Request Logging

```typescript
const fetchUser = async (id: string) => {
  logger.api(`Fetching user ${id}...`);
  logger.time(`fetchUser-${id}`);

  try {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json();

    logger.timeEnd(`fetchUser-${id}`);
    logger.success('User fetched successfully', data);
    return data;
  } catch (error) {
    logger.timeEnd(`fetchUser-${id}`);
    logger.fail('Failed to fetch user', error);
    throw error;
  }
};
```

### Form Submission Flow

```typescript
const handleSubmit = async (formData: FormData) => {
  logger.group('🔄 Form Submission Flow');

  logger.log('Step 1: Validating form data...');
  const validation = validateForm(formData);
  logger.table(validation.errors);

  if (!validation.isValid) {
    logger.fail('Validation failed');
    logger.groupEnd();
    return;
  }

  logger.success('Validation passed');

  logger.loading('Step 2: Submitting to API...');
  logger.time('API submission');

  try {
    const result = await submitForm(formData);
    logger.timeEnd('API submission');
    logger.success('Form submitted successfully!', result);
  } catch (error) {
    logger.timeEnd('API submission');
    logger.error('Submission error:', error);
  }

  logger.groupEnd();
};
```

### Store Updates

```typescript
import { logger } from '@/utils/logger';

export const userStore = {
  setUser: (user: User) => {
    logger.store('Setting user', user);
    // ... store logic
  },

  updateUser: (updates: Partial<User>) => {
    logger.group('📦 User Store Update');
    logger.log('Previous state:', currentUser);
    logger.log('Updates:', updates);

    const newUser = { ...currentUser, ...updates };

    logger.log('New state:', newUser);
    logger.success('User updated successfully');
    logger.groupEnd();

    // ... store logic
  }
};
```

### Router Navigation

```typescript
const navigateTo = (path: string) => {
  logger.route(`Navigating to ${path}`);

  logger.group('Navigation Details');
  logger.log('From:', window.location.pathname);
  logger.log('To:', path);
  logger.log('Timestamp:', new Date().toISOString());
  logger.groupEnd();

  // ... navigation logic
};
```

### Component Lifecycle (SolidJS)

```typescript
import { createEffect, onMount, onCleanup } from 'solid-js';
import { logger } from '@/utils/logger';

const MyComponent = () => {
  onMount(() => {
    logger.success('MyComponent mounted');
  });

  createEffect(() => {
    logger.log('Effect running, dependencies changed');
  });

  onCleanup(() => {
    logger.warn('MyComponent unmounting');
  });

  return <div>Component</div>;
};
```

## 🚀 Migration from console.log

### Before (using console.log)

```typescript
console.log('User data:', user);
console.log('API response:', data);
console.error('Error occurred:', error);

// Have to manually remove or comment before production:
// console.log('Debug info:', debugData);
```

### After (using logger)

```typescript
import { logger } from '@/utils/logger';

logger.log('User data:', user);
logger.api('API response', data);
logger.error('Error occurred:', error);

// No need to remove - automatically disabled in production
logger.log('Debug info:', debugData);
```

## 🔧 TypeScript Support

The logger is fully typed:

```typescript
// All arguments are typed as `any[]` for flexibility
logger.log(string, number, object, array); // ✅ All valid

// Styled methods accept specific types
logger.styled(message: string, styles: string);
logger.logIf(condition: boolean, ...args: any[]);
```

## 📝 Best Practices

1. **Use semantic methods**: Choose `logger.success()`, `logger.fail()`, etc. over generic `logger.log()` when possible
2. **Group related logs**: Use `logger.group()` for complex operations
3. **Measure performance**: Use `logger.time()` for slow operations
4. **Use tables for arrays**: `logger.table()` is more readable than `logger.log()`
5. **Add context**: Include relevant data with your logs
6. **Don't worry about cleanup**: Logs automatically disappear in production

## ⚙️ Environment Detection

Check if you're in development mode:

```typescript
import { logger } from '@/utils/logger';

if (logger.isDev) {
  // This code only runs in development
  logger.log('Development mode active');
}
```

## 🎭 Production Behavior

In production builds (`npm run build`):
- All logger methods become **no-ops** (they do nothing)
- Zero runtime overhead
- No logs appear in browser console
- Bundle size is not affected (dead code elimination)

## 📊 Output Examples

```typescript
// Console output in development:

✅ User created successfully! { id: 1, name: 'John' }
❌ Failed to save data Error: Network error
⏳ Fetching data from API...
🌐 API: POST /api/users { email: 'test@example.com' }
📦 Store: User state updated { isLoggedIn: true }
🧭 Route: Navigated to /dashboard
```

## 🔄 Integration with Existing Code

You can gradually migrate from `console.log` to `logger`:

```typescript
// Create an alias for easy search/replace
import { logger as log } from '@/utils/logger';

// Then replace:
// console.log → log.log
// console.warn → log.warn
// console.error → log.error
```

---

**Happy Debugging! 🐛✨**
