import { Component, createSignal, createEffect, For } from 'solid-js';
import {
  useDebounce,
  useDebouncedCallback,
  useDebouncedSearch,
  useDebouncedInput,
  createDebouncedSignal,
  useThrottle
} from '../hooks';
import { Card, Button } from '../modules/ui';
import { devLog } from '../services/utils';

interface SearchResult {
  id: string;
  name: string;
  description: string;
}

const DebounceExamples: Component = () => {
  // Example 1: Basic useDebounce
  const [basicValue, setBasicValue] = createSignal('');
  const [debouncedBasicValue, setDebouncedBasicValue] = createSignal('');
  const debouncedSetBasicValue = useDebounce(setDebouncedBasicValue, 500);

  // Example 2: useDebouncedCallback
  const [callbackLog, setCallbackLog] = createSignal<string[]>([]);
  const { debounced: logMessage, cancel, flush } = useDebouncedCallback(
    (message: string) => {
      setCallbackLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    },
    1000
  );

  // Example 3: useDebouncedSearch
  const [searchResults, setSearchResults] = createSignal<SearchResult[]>([]);
  const { search, isSearching, cancel: cancelSearch } = useDebouncedSearch(
    async (query: string) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockResults: SearchResult[] = [
        { id: '1', name: `Result for "${query}"`, description: 'Mock search result 1' },
        { id: '2', name: `Another result for "${query}"`, description: 'Mock search result 2' },
        { id: '3', name: `Third result for "${query}"`, description: 'Mock search result 3' },
      ];
      
      setSearchResults(mockResults);
    },
    500
  );

  // Example 4: useDebouncedInput with validation
  const emailInput = useDebouncedInput(
    '',
    (value) => {
      if (!value) return 'Email is required';
      if (!value.includes('@')) return 'Invalid email format';
      if (!value.includes('.')) return 'Invalid email domain';
      return null;
    },
    800
  );

  // Example 5: createDebouncedSignal
  const [instantValue, setInstantValue, debouncedValue] = createDebouncedSignal('', 600);
  
  createEffect(() => {
    devLog('Debounced value changed:', debouncedValue());
  });

  // Example 6: useThrottle for scroll events
  const [scrollCount, setScrollCount] = createSignal(0);
  const [throttledCount, setThrottledCount] = createSignal(0);
  
  const handleScroll = useThrottle(() => {
    setThrottledCount(prev => prev + 1);
  }, 500);

  const handleScrollNormal = () => {
    setScrollCount(prev => prev + 1);
    handleScroll();
  };

  // Styles
  const containerStyle = {
    padding: '2rem',
    'max-width': '1200px',
    margin: '0 auto'
  };

  const exampleStyle = {
    'margin-bottom': '2rem'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    'margin-bottom': '0.5rem'
  };

  const outputStyle = {
    padding: '1rem',
    background: 'var(--strip-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-family': 'monospace',
    'font-size': '0.875rem',
    'margin-top': '0.5rem'
  };

  const buttonStyle = {
    'margin-right': '0.5rem',
    'margin-top': '0.5rem'
  };

  const scrollableStyle = {
    height: '150px',
    'overflow-y': 'auto',
    border: '1px solid var(--border-color)',
    padding: '1rem',
    'margin-top': '0.5rem'
  };

  const errorStyle = {
    color: '#d32f2f',
    'font-size': '0.875rem',
    'margin-top': '0.25rem'
  };

  const successStyle = {
    color: '#2e7d32',
    'font-size': '0.875rem',
    'margin-top': '0.25rem'
  };

  return (
    <div style={containerStyle}>
      <h1>Debounce Utilities Examples</h1>
      
      {/* Example 1: Basic useDebounce */}
      <Card title="1. Basic useDebounce" style={exampleStyle}>
        <p>Type to see the debounced value update after 500ms of inactivity:</p>
        <input
          type="text"
          style={inputStyle}
          value={basicValue()}
          onInput={(e) => {
            setBasicValue(e.currentTarget.value);
            debouncedSetBasicValue(e.currentTarget.value);
          }}
          placeholder="Type something..."
        />
        <div style={outputStyle}>
          <div>Instant value: {basicValue()}</div>
          <div>Debounced value: {debouncedBasicValue()}</div>
        </div>
      </Card>

      {/* Example 2: useDebouncedCallback */}
      <Card title="2. useDebouncedCallback with cancel/flush" style={exampleStyle}>
        <p>Type to log messages with 1s debounce. Use cancel/flush to control execution:</p>
        <input
          type="text"
          style={inputStyle}
          onInput={(e) => logMessage(e.currentTarget.value)}
          placeholder="Type messages to log..."
        />
        <div>
          <Button variant="outline" style={buttonStyle} onClick={cancel}>
            Cancel Pending
          </Button>
          <Button variant="outline" style={buttonStyle} onClick={flush}>
            Flush Now
          </Button>
          <Button 
            variant="outline" 
            style={buttonStyle} 
            onClick={() => setCallbackLog([])}
          >
            Clear Log
          </Button>
        </div>
        <div style={outputStyle}>
          <div>Log messages (debounced by 1s):</div>
          <For each={callbackLog()}>
            {(log) => <div>• {log}</div>}
          </For>
          {callbackLog().length === 0 && <div style={{ color: 'var(--text-muted)' }}>No messages yet...</div>}
        </div>
      </Card>

      {/* Example 3: useDebouncedSearch */}
      <Card title="3. useDebouncedSearch with loading state" style={exampleStyle}>
        <p>Search with automatic loading state and 500ms debounce:</p>
        <input
          type="text"
          style={inputStyle}
          onInput={(e) => search(e.currentTarget.value)}
          placeholder="Search for something..."
          disabled={isSearching()}
        />
        <Button 
          variant="outline" 
          style={buttonStyle} 
          onClick={cancelSearch}
          disabled={!isSearching()}
        >
          Cancel Search
        </Button>
        
        <div style={outputStyle}>
          {isSearching() ? (
            <div>🔄 Searching...</div>
          ) : (
            <div>
              <div>Search Results:</div>
              <For each={searchResults()}>
                {(result) => (
                  <div style={{ 'margin-top': '0.5rem' }}>
                    <strong>{result.name}</strong>
                    <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                      {result.description}
                    </div>
                  </div>
                )}
              </For>
              {searchResults().length === 0 && (
                <div style={{ color: 'var(--text-muted)' }}>No results. Start typing to search...</div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Example 4: useDebouncedInput with validation */}
      <Card title="4. useDebouncedInput with validation" style={exampleStyle}>
        <p>Email input with 800ms debounced validation:</p>
        <input
          type="email"
          style={{
            ...inputStyle,
            'border-color': emailInput.isPending() ? '#2196f3' : 
                          emailInput.error() ? '#d32f2f' : 
                          emailInput.debouncedValue() && emailInput.isValid() ? '#2e7d32' : 
                          'var(--border-color)'
          }}
          value={emailInput.value()}
          onInput={(e) => emailInput.setValue(e.currentTarget.value)}
          placeholder="Enter your email..."
        />
        
        {emailInput.isPending() && (
          <div style={{ color: '#2196f3', 'font-size': '0.875rem' }}>
            ⏳ Validating...
          </div>
        )}
        
        {!emailInput.isPending() && emailInput.error() && (
          <div style={errorStyle}>
            ❌ {emailInput.error()}
          </div>
        )}
        
        {!emailInput.isPending() && emailInput.debouncedValue() && emailInput.isValid() && (
          <div style={successStyle}>
            ✅ Valid email address
          </div>
        )}
        
        <Button 
          variant="outline" 
          style={buttonStyle} 
          onClick={emailInput.reset}
        >
          Reset
        </Button>
        
        <div style={outputStyle}>
          <div>Instant value: {emailInput.value()}</div>
          <div>Debounced value: {emailInput.debouncedValue()}</div>
          <div>Is valid: {emailInput.isValid() ? 'Yes' : 'No'}</div>
          <div>Is pending: {emailInput.isPending() ? 'Yes' : 'No'}</div>
        </div>
      </Card>

      {/* Example 5: createDebouncedSignal */}
      <Card title="5. createDebouncedSignal" style={exampleStyle}>
        <p>Signal with built-in 600ms debouncing (check console for effect logs):</p>
        <input
          type="text"
          style={inputStyle}
          value={instantValue()}
          onInput={(e) => setInstantValue(e.currentTarget.value)}
          placeholder="Type and watch console..."
        />
        <div style={outputStyle}>
          <div>Instant signal: {instantValue()}</div>
          <div>Debounced signal: {debouncedValue()}</div>
        </div>
      </Card>

      {/* Example 6: useThrottle */}
      <Card title="6. useThrottle for high-frequency events" style={exampleStyle}>
        <p>Scroll in the box below to see throttling in action (500ms throttle):</p>
        <div 
          style={scrollableStyle}
          onScroll={handleScrollNormal}
        >
          <div style={{ height: '400px', padding: '1rem' }}>
            <h3>Scroll me!</h3>
            <p>This content is scrollable. The scroll event fires many times, but the throttled handler only executes at most once every 500ms.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
            <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          </div>
        </div>
        <div style={outputStyle}>
          <div>Normal scroll events: {scrollCount()}</div>
          <div>Throttled scroll events: {throttledCount()}</div>
          <div>Reduction: {scrollCount() > 0 ? Math.round((1 - throttledCount() / scrollCount()) * 100) : 0}%</div>
        </div>
      </Card>
    </div>
  );
};

export default DebounceExamples;