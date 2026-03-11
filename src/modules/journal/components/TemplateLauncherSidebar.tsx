import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import { JournalTemplate } from '../types/journalTemplateTypes';
import { FormInput } from '../../ui';

interface TemplateLauncherSidebarProps {
  templates: JournalTemplate[];
  selectedTemplateId: string | null;
  onTemplateSelect: (templateId: string) => void;
  favorites: string[];
  recentTemplates: string[];
  onToggleFavorite: (templateId: string) => void;
}

const TemplateLauncherSidebar: Component<TemplateLauncherSidebarProps> = (props) => {
  const [searchQuery, setSearchQuery] = createSignal('');
  // Start with all categories expanded by default
  const [expandedCategories, setExpandedCategories] = createSignal<Set<string>>(
    new Set(['general', 'gastos', 'ingresos', 'compras', 'ventas', 'nomina', 'impuestos'])
  );

  // Group templates by category
  const categorizedTemplates = createMemo(() => {
    const categories = new Map<string, JournalTemplate[]>();
    props.templates.forEach(template => {
      if (!categories.has(template.category)) {
        categories.set(template.category, []);
      }
      categories.get(template.category)!.push(template);
    });
    return categories;
  });

  // Filter templates based on search
  const filteredTemplates = createMemo(() => {
    const query = searchQuery().toLowerCase();
    if (!query) return props.templates;

    return props.templates.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.settings.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Get favorite templates
  const favoriteTemplates = createMemo(() => {
    return props.templates.filter(t => props.favorites.includes(t.id));
  });

  // Get recent templates
  const recentTemplatesList = createMemo(() => {
    return props.recentTemplates
      .map(id => props.templates.find(t => t.id === id))
      .filter(Boolean)
      .slice(0, 5) as JournalTemplate[];
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const isCategoryExpanded = (category: string) => {
    return expandedCategories().has(category);
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      'general': '📋',
      'gastos': '💸',
      'ingresos': '💰',
      'compras': '🛒',
      'ventas': '📈',
      'nomina': '👥',
      'impuestos': '🧾'
    };
    return icons[category] || '📄';
  };

  const sidebarStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    height: '100%',
    'max-height': '100%',
    'border-right': '1px solid var(--border-color)',
    background: 'var(--surface-color)',
    overflow: 'hidden'
  };

  const sectionStyle = {
    padding: '1rem',
    'border-bottom': '1px solid var(--border-color)'
  };

  const sectionTitleStyle = {
    'font-size': '0.75rem',
    'font-weight': '600',
    'text-transform': 'uppercase' as const,
    color: 'var(--text-muted)',
    'letter-spacing': '0.5px',
    'margin-bottom': '0.75rem'
  };

  const templateItemStyle = (isSelected: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '0.5rem 0.75rem',
    'border-radius': 'var(--border-radius)',
    cursor: 'pointer',
    'margin-bottom': '0.25rem',
    background: isSelected ? 'var(--primary-color)' : 'transparent',
    color: isSelected ? 'white' : 'var(--text-primary)',
    transition: 'all 0.2s ease',
    ':hover': {
      background: isSelected ? 'var(--primary-color)' : '#f5f5f5'
    }
  });

  const categoryHeaderStyle = (isExpanded: boolean) => ({
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    'border-radius': 'var(--border-radius)',
    'margin-bottom': '0.25rem',
    transition: 'background 0.2s ease',
    ':hover': {
      background: '#f5f5f5'
    }
  });

  const starIconStyle = (isFavorite: boolean) => ({
    cursor: 'pointer',
    color: isFavorite ? '#ffd700' : 'var(--text-muted)',
    'font-size': '1rem',
    transition: 'color 0.2s ease'
  });

  const scrollAreaStyle = {
    flex: '1',
    'overflow-y': 'auto' as const,
    'overflow-x': 'hidden' as const
  };

  const searchSectionStyle = {
    padding: '1rem',
    'border-top': '1px solid var(--border-color)',
    background: 'white'
  };

  return (
    <div style={sidebarStyle}>
      {/* Quick Access - Favorites */}
      <Show when={favoriteTemplates().length > 0}>
        <div style={{ ...sectionStyle, 'max-height': '150px', 'overflow-y': 'auto' }}>
          <div style={{ ...sectionTitleStyle, position: 'sticky' as const, top: '0', background: 'var(--surface-color)', 'padding-top': '0.25rem', 'margin-top': '-0.25rem' }}>Favoritos</div>
          <For each={favoriteTemplates()}>
            {(template) => (
              <div
                style={templateItemStyle(props.selectedTemplateId === template.id)}
                onClick={() => props.onTemplateSelect(template.id)}
              >
                <div style={{ flex: '1', 'min-width': '0' }}>
                  <div style={{
                    'font-weight': '500',
                    'font-size': '0.875rem',
                    'white-space': 'nowrap',
                    overflow: 'hidden',
                    'text-overflow': 'ellipsis'
                  }}>
                    {template.name}
                  </div>
                </div>
                <div
                  style={starIconStyle(true)}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onToggleFavorite(template.id);
                  }}
                >
                  ★
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Recent Templates */}
      <Show when={recentTemplatesList().length > 0}>
        <div style={{ ...sectionStyle, 'max-height': '180px', 'overflow-y': 'auto' }}>
          <div style={{ ...sectionTitleStyle, position: 'sticky' as const, top: '-16px', background: 'var(--surface-color)', 'padding-top': '0.25rem', 'margin': '-0.25rem 0' }}>Recientes</div>
          <For each={recentTemplatesList()}>
            {(template) => (
              <div
                style={templateItemStyle(props.selectedTemplateId === template.id)}
                onClick={() => props.onTemplateSelect(template.id)}
              >
                <div style={{ flex: '1', 'min-width': '0' }}>
                  <div style={{
                    'font-weight': '500',
                    'font-size': '0.875rem',
                    'white-space': 'nowrap',
                    overflow: 'hidden',
                    'text-overflow': 'ellipsis'
                  }}>
                    {template.name}
                  </div>
                  <div style={{
                    'font-size': '0.75rem',
                    color: props.selectedTemplateId === template.id ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                    'white-space': 'nowrap',
                    overflow: 'hidden',
                    'text-overflow': 'ellipsis'
                  }}>
                    {template.category}
                  </div>
                </div>
                <div
                  style={starIconStyle(props.favorites.includes(template.id))}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onToggleFavorite(template.id);
                  }}
                >
                  {props.favorites.includes(template.id) ? '★' : '☆'}
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* By Category */}
      <div style={{
        flex: '1',
        'overflow-y': 'auto',
        'overflow-x': 'hidden',
        'min-height': '0'
      }}>
        <div style={{ padding: '1rem 1rem 0.5rem', ...sectionTitleStyle, position: 'sticky' as const, top: '0', background: 'var(--surface-color)', 'z-index': '1' }}>
          Por Categoría
        </div>
        <div>
          <For each={Array.from(categorizedTemplates().entries())}>
            {([category, templates]) => {
              const templatesInCategory = searchQuery()
                ? templates.filter(t => filteredTemplates().includes(t))
                : templates;

              return (
                <Show when={templatesInCategory.length > 0}>
                  <div style={{ padding: '0 1rem' }}>
                    {/* Category Header */}
                    <div
                      style={categoryHeaderStyle(isCategoryExpanded(category))}
                      onClick={() => toggleCategory(category)}
                    >
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                        <span>{getCategoryIcon(category)}</span>
                        <span style={{ 'font-weight': '500', 'font-size': '0.875rem' }}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </span>
                        <span style={{
                          'font-size': '0.75rem',
                          color: 'var(--text-muted)',
                          'font-weight': '400'
                        }}>
                          ({templatesInCategory.length})
                        </span>
                      </div>
                      <span style={{
                        'font-size': '0.75rem',
                        transform: isCategoryExpanded(category) ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }}>
                        ▶
                      </span>
                    </div>

                    {/* Category Templates */}
                    <Show when={isCategoryExpanded(category)}>
                      <div style={{ 'padding-left': '1.5rem', 'margin-bottom': '0.5rem' }}>
                        <Show when={templatesInCategory.length === 0}>
                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', padding: '0.5rem' }}>
                            No hay plantillas en esta categoría
                          </div>
                        </Show>
                        <For each={templatesInCategory}>
                          {(template) => (
                            <div
                              style={templateItemStyle(props.selectedTemplateId === template.id)}
                              onClick={() => props.onTemplateSelect(template.id)}
                            >
                              <div style={{ flex: '1', 'min-width': '0' }}>
                                <div style={{
                                  'font-weight': '500',
                                  'font-size': '0.875rem',
                                  'white-space': 'nowrap',
                                  overflow: 'hidden',
                                  'text-overflow': 'ellipsis'
                                }}>
                                  {template.name}
                                </div>
                                <div style={{
                                  'font-size': '0.75rem',
                                  color: props.selectedTemplateId === template.id
                                    ? 'rgba(255,255,255,0.8)'
                                    : 'var(--text-muted)',
                                  'white-space': 'nowrap',
                                  overflow: 'hidden',
                                  'text-overflow': 'ellipsis'
                                }}>
                                  {template.description}
                                </div>
                              </div>
                              <div
                                style={starIconStyle(props.favorites.includes(template.id))}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  props.onToggleFavorite(template.id);
                                }}
                              >
                                {props.favorites.includes(template.id) ? '★' : '☆'}
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </Show>
              );
            }}
          </For>
        </div>
      </div>

      {/* Search at Bottom */}
      <div style={searchSectionStyle}>
        <FormInput
          label=""
          value={searchQuery()}
          onChange={setSearchQuery}
          placeholder="Buscar plantillas..."
        />
        <div style={{
          'margin-top': '0.5rem',
          'font-size': '0.75rem',
          color: 'var(--text-muted)'
        }}>
          {searchQuery()
            ? `${filteredTemplates().length} resultado(s)`
            : `${props.templates.length} plantillas disponibles`}
        </div>
      </div>
    </div>
  );
};

export default TemplateLauncherSidebar;
