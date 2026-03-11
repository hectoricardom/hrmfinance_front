/**
 * LazyRenderList - A virtualized list component for SolidJS
 *
 * Renders items progressively in batches to prevent UI freezing
 * with large datasets. Uses requestAnimationFrame for smooth rendering.
 */
import { Component, createSignal, createEffect, onCleanup, For, Show, JSX } from 'solid-js';

interface LazyRenderListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => JSX.Element;
  batchSize?: number;
  initialBatchSize?: number;
  loadMoreThreshold?: number;
  containerStyle?: JSX.CSSProperties;
  itemKey?: (item: T, index: number) => string | number;
  emptyMessage?: string | JSX.Element;
  loadingMessage?: string;
}

function LazyRenderList<T>(props: LazyRenderListProps<T>): JSX.Element {
  const batchSize = () => props.batchSize ?? 20;
  const initialBatchSize = () => props.initialBatchSize ?? 30;

  const [renderedCount, setRenderedCount] = createSignal(initialBatchSize());
  const [isLoadingMore, setIsLoadingMore] = createSignal(false);

  let containerRef: HTMLDivElement | undefined;
  let loadMoreTimeout: number | undefined;

  // Reset rendered count when items change
  createEffect(() => {
    const itemsLength = props.items.length;
    // Reset to initial batch when items change
    setRenderedCount(Math.min(initialBatchSize(), itemsLength));
    setIsLoadingMore(false);
  });

  // Progressive loading using requestAnimationFrame
  const loadMoreItems = () => {
    if (isLoadingMore()) return;

    const currentCount = renderedCount();
    const totalItems = props.items.length;

    if (currentCount >= totalItems) return;

    setIsLoadingMore(true);

    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      const newCount = Math.min(currentCount + batchSize(), totalItems);
      setRenderedCount(newCount);
      setIsLoadingMore(false);
    });
  };

  // Handle scroll to load more
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLDivElement;
    const threshold = props.loadMoreThreshold ?? 200;

    const isNearBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < threshold;

    if (isNearBottom && renderedCount() < props.items.length) {
      // Debounce the load more call
      if (loadMoreTimeout) {
        clearTimeout(loadMoreTimeout);
      }
      loadMoreTimeout = window.setTimeout(() => {
        loadMoreItems();
      }, 50);
    }
  };

  // Cleanup timeout on unmount
  onCleanup(() => {
    if (loadMoreTimeout) {
      clearTimeout(loadMoreTimeout);
    }
  });

  // Get visible items
  const visibleItems = () => props.items.slice(0, renderedCount());

  // Check if there are more items to load
  const hasMore = () => renderedCount() < props.items.length;

  // Default container style
  const defaultContainerStyle: JSX.CSSProperties = {
    'overflow-y': 'auto',
    'max-height': '100%',
    ...props.containerStyle
  };

  return (
    <div
      ref={containerRef}
      style={defaultContainerStyle}
      onScroll={handleScroll}
    >
      <Show when={props.items.length === 0}>
        <div style={{
          'text-align': 'center',
          padding: '2rem',
          color: 'var(--text-muted)'
        }}>
          {props.emptyMessage ?? 'No items to display'}
        </div>
      </Show>

      <Show when={props.items.length > 0}>
        <For each={visibleItems()}>
          {(item, index) => props.renderItem(item, index())}
        </For>

        {/* Load more indicator */}
        <Show when={hasMore()}>
          <div
            style={{
              'text-align': 'center',
              padding: '1rem',
              color: 'var(--text-muted)',
              'font-size': '0.85rem'
            }}
          >
            <Show when={isLoadingMore()} fallback={
              <button
                onClick={loadMoreItems}
                style={{
                  background: 'var(--gray-100)',
                  border: '1px solid var(--border-color)',
                  'border-radius': '4px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  color: 'var(--text-color)'
                }}
              >
                {props.loadingMessage ?? `Load more (${props.items.length - renderedCount()} remaining)`}
              </button>
            }>
              <span>Loading...</span>
            </Show>
          </div>
        </Show>

        {/* Items count indicator */}
        <Show when={!hasMore() && props.items.length > initialBatchSize()}>
          <div style={{
            'text-align': 'center',
            padding: '0.5rem',
            color: 'var(--text-muted)',
            'font-size': '0.75rem'
          }}>
            Showing all {props.items.length} items
          </div>
        </Show>
      </Show>
    </div>
  );
}

export default LazyRenderList;
