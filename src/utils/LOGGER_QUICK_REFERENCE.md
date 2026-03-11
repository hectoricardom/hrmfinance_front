# Logger Quick Reference 🚀

> Development-only logging that automatically disappears in production

## 📥 Import

```typescript
import { logger } from '@/utils/logger';
```

## ⚡ Quick Examples

```typescript
// Basic logging
logger.log('Simple message');
logger.warn('Warning!');
logger.error('Error occurred');

// Styled with emojis (best for quick visual scanning)
logger.success('✅ Operation successful!');
logger.fail('❌ Operation failed');
logger.loading('⏳ Processing...');
logger.api('🌐 API: GET /users');
logger.store('📦 State updated');
logger.route('🧭 Navigated to /home');

// Tables (great for arrays/objects)
logger.table(users);

// Grouping (organize related logs)
logger.group('Operation Name', () => {
  logger.log('Step 1');
  logger.log('Step 2');
});

// Performance (measure execution time)
logger.time('operation');
// ... code to measure ...
logger.timeEnd('operation'); // Outputs: operation: 123.45ms
```

## 🎯 Common Use Cases

### API Calls
```typescript
logger.api('Fetching users...');
logger.time('fetchUsers');
const users = await fetchUsers();
logger.timeEnd('fetchUsers');
logger.success('Users fetched', users);
```

### Form Submission
```typescript
logger.group('Form Submission');
logger.log('Validating...');
logger.table(formData);
logger.success('Submitted!');
logger.groupEnd();
```

### State Updates
```typescript
logger.store('User logged in', { id: user.id, name: user.name });
```

### Errors
```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.fail('Operation failed', error);
}
```

## 📋 All Methods

| Method | Description | Example |
|--------|-------------|---------|
| `log()` | Standard log | `logger.log('message')` |
| `warn()` | Warning | `logger.warn('warning')` |
| `error()` | Error | `logger.error('error', err)` |
| `info()` | Info | `logger.info('info')` |
| `success()` | ✅ Success (green) | `logger.success('Done!')` |
| `fail()` | ❌ Failure (red) | `logger.fail('Failed')` |
| `loading()` | ⏳ Loading (yellow) | `logger.loading('Loading...')` |
| `api()` | 🌐 API call (blue) | `logger.api('GET /users')` |
| `store()` | 📦 State (purple) | `logger.store('Updated')` |
| `route()` | 🧭 Navigation (teal) | `logger.route('/home')` |
| `table()` | Table view | `logger.table(data)` |
| `group()` | Start group | `logger.group('Name')` |
| `groupEnd()` | End group | `logger.groupEnd()` |
| `time()` | Start timer | `logger.time('task')` |
| `timeEnd()` | End timer | `logger.timeEnd('task')` |
| `trace()` | Stack trace | `logger.trace()` |
| `dir()` | Object inspect | `logger.dir(obj)` |
| `logIf()` | Conditional log | `logger.logIf(cond, 'msg')` |

## 🔥 Pro Tips

1. **Use styled methods** for visual clarity:
   ```typescript
   logger.success('User created'); // ✅ Better than logger.log()
   logger.fail('Save failed');     // ❌ Better than logger.error()
   ```

2. **Group related operations**:
   ```typescript
   logger.group('User Registration', () => {
     logger.log('Checking email...');
     logger.log('Creating account...');
     logger.success('Registration complete!');
   });
   ```

3. **Measure performance** of slow operations:
   ```typescript
   logger.time('database query');
   await db.query();
   logger.timeEnd('database query'); // Outputs execution time
   ```

4. **Use tables for data**:
   ```typescript
   // Instead of:
   logger.log(users);

   // Use:
   logger.table(users); // Much more readable!
   ```

5. **Don't remove logs** - they're automatically disabled in production!

## 🚫 What NOT to Do

```typescript
// ❌ DON'T use console.log (not stripped in production)
console.log('debug info');

// ✅ DO use logger (automatically stripped)
logger.log('debug info');

// ❌ DON'T manually check environment
if (process.env.NODE_ENV === 'development') {
  console.log('debug');
}

// ✅ DO just use logger (environment check built-in)
logger.log('debug');
```

## 🎨 Color Guide

- 🟢 **Success** = Green (`logger.success()`)
- 🔴 **Failure** = Red (`logger.fail()`)
- 🟡 **Loading** = Yellow (`logger.loading()`)
- 🔵 **API** = Blue (`logger.api()`)
- 🟣 **Store** = Purple (`logger.store()`)
- 🟦 **Route** = Teal (`logger.route()`)

---

**Remember**: All logs automatically disappear in production builds! 🎉
