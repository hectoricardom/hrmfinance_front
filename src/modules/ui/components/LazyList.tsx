import { Component, createSignal, createEffect, For, Show, onMount, onCleanup, JSX } from 'solid-js';
import { useTranslation } from '../../../translations';

interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => JSX.Element;
  batchSize?: number;
  gridColumns?: string; // e.g., 'repeat(auto-fit, minmax(400px, 1fr))' or '1fr' for single column
  gap?: string;
  showStats?: boolean;
  showProgressBar?: boolean;
  showLoadAllButton?: boolean;
  emptyMessage?: string;
  itemsLabel?: string; // e.g., 'entries', 'items', 'records'
  keyExtractor?: (item: T) => string | number;
}

function LazyList<T>(props: LazyListProps<T>): JSX.Element {
  const { t } = useTranslation();
  const batchSize = props.batchSize || 20;
  const showStats = props.showStats !== false;
  const showProgressBar = props.showProgressBar !== false;
  const showLoadAllButton = props.showLoadAllButton !== false;

  const [visibleCount, setVisibleCount] = createSignal(batchSize);
  const [isLoadingMore, setIsLoadingMore] = createSignal(false);
  let sentinelRef: HTMLDivElement | undefined;
  let observer: IntersectionObserver | undefined;

  const visibleItems = () => props.items.slice(0, visibleCount());
  const hasMore = () => visibleCount() < props.items.length;
  const remainingCount = () => props.items.length - visibleCount();

  // Reset visible count when items change
  createEffect(() => {
    const itemsLength = props.items.length;
    // Reset to initial batch when items change (e.g., after filtering)
    setVisibleCount(Math.min(batchSize, itemsLength));
  });

  const loadMore = () => {
    if (isLoadingMore() || !hasMore()) return;

    setIsLoadingMore(true);

    // Use requestAnimationFrame for smooth loading
    requestAnimationFrame(() => {
      setVisibleCount(prev => Math.min(prev + batchSize, props.items.length));
      setIsLoadingMore(false);
    });
  };

  // Set up Intersection Observer for infinite scroll
  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore() && !isLoadingMore()) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px', // Start loading before reaching the end
        threshold: 0.1
      }
    );

    if (sentinelRef) {
      observer.observe(sentinelRef);
    }
  });

  onCleanup(() => {
    if (observer) {
      observer.disconnect();
    }
  });

  // Re-observe sentinel when it changes
  createEffect(() => {
    if (observer && sentinelRef) {
      observer.disconnect();
      observer.observe(sentinelRef);
    }
  });

  const gridStyle = () => ({
    display: 'grid',
    'grid-template-columns': props.gridColumns || 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: props.gap || '1.5rem'
  });

  const loadingStyle = {
    display: 'flex',
    'justify-content': 'center',
    'align-items': 'center',
    padding: '2rem',
    color: 'var(--text-muted)'
  };

  const progressBarContainerStyle = {
    width: '100%',
    height: '4px',
    background: 'var(--border-color)',
    'border-radius': '2px',
    overflow: 'hidden',
    'margin-top': '1rem'
  };

  const progressBarStyle = () => ({
    width: `${(visibleCount() / props.items.length) * 100}%`,
    height: '100%',
    background: 'var(--primary-color)',
    transition: 'width 0.3s ease'
  });

  const statsStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    padding: '0.75rem 1rem',
    background: 'var(--surface-color)',
    'border-radius': 'var(--border-radius-sm)',
    'margin-bottom': '1rem',
    'font-size': '0.875rem',
    color: 'var(--text-muted)'
  };

  const itemsLabel = props.itemsLabel || t('common.items', 'elementos');

  
  return (

    <div>
      <Show when={props.items.length === 0}>
        <div style={{ 'text-align': 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        {props.emptyMessage || t('common.noItems', 'No hay elementos para mostrar')}
      </div>
      </Show>


     <Show when={props.items.length }>
      {/* Stats bar */}
      <Show when={showStats}>
        <div style={statsStyle}>
          <span>
            {t('common.showing', 'Mostrando')} <strong>{visibleCount()}</strong> {t('common.of', 'de')} <strong>{props.items.length}</strong> {itemsLabel}
          </span>
          <Show when={hasMore()}>
            <button
              onClick={loadMore}
              disabled={isLoadingMore()}
              style={{
                padding: '0.25rem 0.75rem',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer',
                'font-size': '0.8rem'
              }}
            >
              {isLoadingMore()
                ? t('common.loading', 'Cargando...')
                : `${t('common.loadMore', 'Cargar más')} (${remainingCount()})`
              }
            </button>
          </Show>
        </div>
      </Show>

      {/* Progress bar */}
      <Show when={showProgressBar && props.items.length > batchSize}>
        <div style={progressBarContainerStyle}>
          <div style={progressBarStyle()} />
        </div>
      </Show>

      {/* Items grid */}
      <div style={gridStyle()}>
        <For each={visibleItems()}>
          {(item, index) => props.renderItem(item, index())}
        </For>
      </div>

      {/* Loading indicator / Sentinel for infinite scroll */}
      <Show when={hasMore()}>
        <div
          ref={sentinelRef}
          style={loadingStyle}
        >
          <Show when={isLoadingMore()} fallback={
            <span style={{ 'font-size': '0.9rem' }}>
              ↓ {t('common.scrollForMore', 'Desplaza para cargar más')} ({remainingCount()} {t('common.remaining', 'restantes')})
            </span>
          }>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid var(--border-color)',
                'border-top-color': 'var(--primary-color)',
                'border-radius': '50%',
                animation: 'spin 1s linear infinite'
              }} />
              {t('common.loading', 'Cargando...')}
            </div>
          </Show>
        </div>
      </Show>

      {/* Load all button when there are many remaining */}
      <Show when={showLoadAllButton && remainingCount() > batchSize * 2}>
        <div style={{
          'text-align': 'center',
          padding: '1rem',
          'margin-top': '0.5rem'
        }}>
          <button
            onClick={() => setVisibleCount(props.items.length)}
            style={{
              padding: '0.5rem 1.5rem',
              background: 'transparent',
              color: 'var(--primary-color)',
              border: '1px solid var(--primary-color)',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-size': '0.85rem'
            }}
          >
            {t('common.loadAll', 'Cargar todos')} ({props.items.length})
          </button>
          <p style={{
            'font-size': '0.75rem',
            color: 'var(--text-muted)',
            'margin-top': '0.5rem'
          }}>
            {t('common.loadAllWarning', 'Cargar muchos registros puede afectar el rendimiento')}
          </p>
        </div>
      </Show>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
   
    </Show>
    </div>
  )
}

export default LazyList;
