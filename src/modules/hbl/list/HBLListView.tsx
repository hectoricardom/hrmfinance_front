import { Component, createSignal, Show, For } from 'solid-js';
import { Card, Button, FormInput } from '../../ui';
import { useTranslation } from '../../../translations';
import { hblStore } from '../data/hblStore';
import { HBLDetailView } from '../details';
//import HBLFormModal from '../details/HBLFormModal';
import { HBL } from '../types';
import { printSelectedHBLLabels, printHBLLabels } from '../labels/printHBLLabels';

const HBLListView: Component = () => {
  const { t } = useTranslation();
  const [selectedHBL, setSelectedHBL] = createSignal<HBL | null>(null);
  const [editingHBL, setEditingHBL] = createSignal<HBL | null>(null);
  const [showFilters, setShowFilters] = createSignal(true);

  const {
    paginatedHBLs,
    filteredHBLs,
    loading,
    error,
    searchTerm,
    statusFilter,
    guideFilter,
    dateRange,
    currentPage,
    totalPages,
    uniqueGuides,
    uniqueStatuses,
    selectedHBLs,
    setSearchTerm,
    setStatusFilter,
    setGuideFilter,
    setDateRange,
    setCurrentPage,
    fetchHBLs,
    toggleHBLSelection,
    selectAllHBLs,
    clearSelection,
    deleteHBL,
    updateHBL
  } = hblStore;

  const handleSearch = () => {
    setCurrentPage(1);
    fetchHBLs();
  };

  const handleDelete = async (hbl: HBL) => {
    if (confirm(t('hbl.confirmDelete', 'Are you sure you want to delete this HBL?'))) {
      await deleteHBL(hbl.referenceHId);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'EN BODEGA': '#3b82f6',
      'ENVIADO': '#f59e0b',
      'ENTREGADO': '#10b981',
      'PENDIENTE': '#6b7280',
      'CANCELADO': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div class="hbl-list-view">
      {/* Search and Filters */}
      <Card style={{ 'margin-bottom': '1.5rem' }}>
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            display: 'flex',
            gap: '1rem',
            'margin-bottom': '1rem',
            'flex-wrap': 'wrap'
          }}>
            <div style={{ flex: '1', 'min-width': '300px' }}>
              <FormInput
                type="text"
                placeholder={t('hbl.searchPlaceholder', 'Search by HBL#, air guide, shipper, consignee...')}
                value={searchTerm()}
                onChange={(value) => setSearchTerm(value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={loading()}
            >
              {loading() ? t('common.searching', 'Searching...') : t('common.search', 'Search')}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters())}
            >
              {showFilters() ? t('common.hideFilters', 'Hide Filters') : t('common.showFilters', 'Show Filters')}
            </Button>

            <Show when={filteredHBLs().length > 0}>
              <Button
                variant="success"
                onClick={() => printHBLLabels(filteredHBLs())}
                disabled={loading()}
              >
                🏷️ {t('hbl.printAllLabels', 'Print All Labels')} ({filteredHBLs().length})
              </Button>
            </Show>
          </div>

          <Show when={showFilters()}>
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              'margin-top': '1rem'
            }}>
              {/* Status Filter */}
              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  {t('hbl.status', 'Status')}
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={statusFilter()}
                  onChange={(e) => setStatusFilter(e.currentTarget.value)}
                >
                  <option value="all">{t('common.all', 'All')}</option>
                  <For each={uniqueStatuses()}>
                    {(status) => <option value={status}>{status}</option>}
                  </For>
                </select>
              </div>

              {/* Guide Filter */}
              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  {t('hbl.guideNumber', 'Guide Number')}
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={guideFilter()}
                  onChange={(e) => setGuideFilter(e.currentTarget.value)}
                >
                  <option value="all">{t('common.all', 'All')}</option>
                  <For each={uniqueGuides()}>
                    {(guide) => <option value={guide}>{t('hbl.guideNo', 'Guide No.')} {guide}</option>}
                  </For>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  {t('hbl.dateFrom', 'Date From')}
                </label>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={dateRange().start}
                  onChange={(e) => setDateRange({ ...dateRange(), start: e.currentTarget.value })}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  'margin-bottom': '0.25rem',
                  'font-size': '0.875rem',
                  color: 'var(--text-muted)'
                }}>
                  {t('hbl.dateTo', 'Date To')}
                </label>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    background: 'var(--surface-color)'
                  }}
                  value={dateRange().end}
                  onChange={(e) => setDateRange({ ...dateRange(), end: e.currentTarget.value })}
                />
              </div>
            </div>
          </Show>
        </div>
      </Card>

      {/* Error Display */}
      <Show when={error()}>
        <Card style={{
          'margin-bottom': '1rem',
          'border-color': '#ef4444'
        }}>
          <div style={{
            padding: '1rem',
            color: '#ef4444'
          }}>
            {error()}
          </div>
        </Card>
      </Show>

      {/* Bulk Actions Bar */}
      <Show when={selectedHBLs().size > 0}>
        <Card style={{
          'margin-bottom': '1rem',
          background: 'var(--primary-color)',
          color: 'white'
        }}>
          <div style={{
            padding: '1rem',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center'
          }}>
            <span>
              {t('hbl.selectedCount', '{{count}} items selected', { count: selectedHBLs().size })}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => printSelectedHBLLabels(filteredHBLs(), selectedHBLs())}
                style={{
                  'border-color': 'white',
                  color: 'white'
                }}
              >
                🏷️ {t('hbl.printLabels', 'Print Labels')} ({selectedHBLs().size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                style={{
                  'border-color': 'white',
                  color: 'white'
                }}
              >
                {t('common.clearSelection', 'Clear Selection')}
              </Button>
            </div>
          </div>
        </Card>
      </Show>

      {/* HBL Table */}
      <Card>
        <div style={{ 'overflow-x': 'auto' }}>
          <table style={{
            width: '100%',
            'border-collapse': 'collapse'
          }}>
            <thead>
              <tr style={{
                'border-bottom': '2px solid var(--border-color)',
                background: 'var(--surface-color)'
              }}>
                <th style={{ padding: '1rem', 'text-align': 'left' }}>
                  <input
                    type="checkbox"
                    checked={selectedHBLs().size === paginatedHBLs().length && paginatedHBLs().length > 0}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        selectAllHBLs();
                      } else {
                        clearSelection();
                      }
                    }}
                  />
                </th>
                <th style={{ padding: '1rem', 'text-align': 'left', 'font-weight': '600' }}>
                  {t('hbl.hblNumber', 'HBL #')}
                </th>
                <th style={{ padding: '1rem', 'text-align': 'left', 'font-weight': '600' }}>
                  {t('hbl.airGuide', 'Air Guide')}
                </th>
                <th style={{ padding: '1rem', 'text-align': 'left', 'font-weight': '600' }}>
                  {t('hbl.shipper', 'Shipper')}
                </th>
                <th style={{ padding: '1rem', 'text-align': 'left', 'font-weight': '600' }}>
                  {t('hbl.consignee', 'Consignee')}
                </th>
                <th style={{ padding: '1rem', 'text-align': 'left', 'font-weight': '600' }}>
                  {t('hbl.status', 'Status')}
                </th>
                <th style={{ padding: '1rem', 'text-align': 'left', 'font-weight': '600' }}>
                  {t('hbl.date', 'Date')}
                </th>
                <th style={{ padding: '1rem', 'text-align': 'left', 'font-weight': '600' }}>
                  {t('common.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              <Show
                when={!loading() && paginatedHBLs().length > 0}
                fallback={
                  <tr>
                    <td colspan="8" style={{
                      padding: '3rem',
                      'text-align': 'center',
                      color: 'var(--text-muted)'
                    }}>
                      {loading() 
                        ? t('common.loading', 'Loading...') 
                        : t('hbl.noResults', 'No HBLs found. Try adjusting your search criteria.')}
                    </td>
                  </tr>
                }
              >
                <For each={paginatedHBLs()}>
                  {(hbl) => (
                    <tr style={{
                      'border-bottom': '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-color)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '1rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedHBLs().has(hbl.referenceHId)}
                          onChange={() => toggleHBLSelection(hbl.referenceHId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td style={{ padding: '1rem', 'font-weight': '500' }}
                          onClick={() => setSelectedHBL(hbl)}>
                        {hbl.hbl}
                      </td>
                      <td style={{ padding: '1rem' }}
                          onClick={() => setSelectedHBL(hbl)}>
                        {hbl.idairguide}
                      </td>
                      <td style={{ padding: '1rem' }}
                          onClick={() => setSelectedHBL(hbl)}>
                        {hbl.nameshipper}
                      </td>
                      <td style={{ padding: '1rem' }}
                          onClick={() => setSelectedHBL(hbl)}>
                        {hbl.consigneeName}
                      </td>
                      <td style={{ padding: '1rem' }}
                          onClick={() => setSelectedHBL(hbl)}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          'border-radius': '1rem',
                          background: getStatusColor(hbl.idguidestate) + '20',
                          color: getStatusColor(hbl.idguidestate),
                          'font-size': '0.875rem',
                          'font-weight': '500'
                        }}>
                          {hbl.idguidestate}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}
                          onClick={() => setSelectedHBL(hbl)}>
                        {new Date(hbl.datereserve).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingHBL(hbl);
                            }}
                          >
                            {t('common.edit', 'Edit')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(hbl);
                            }}
                            style={{ color: '#ef4444', 'border-color': '#ef4444' }}
                          >
                            {t('common.delete', 'Delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Show when={totalPages() > 1}>
          <div style={{
            padding: '1rem',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'border-top': '1px solid var(--border-color)'
          }}>
            <span style={{ color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
              {t('common.page', 'Page')} {currentPage()} {t('common.of', 'of')} {totalPages()}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage() === 1}
                onClick={() => setCurrentPage(currentPage() - 1)}
              >
                {t('common.previous', 'Previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage() === totalPages()}
                onClick={() => setCurrentPage(currentPage() + 1)}
              >
                {t('common.next', 'Next')}
              </Button>
            </div>
          </div>
        </Show>
      </Card>

      {/* Detail View Modal */}
      <HBLDetailView
        hbl={selectedHBL()}
        isOpen={selectedHBL() !== null}
        onClose={() => setSelectedHBL(null)}
      />

      {/* Edit Modal 
      <Show when={editingHBL()}>
        <HBLFormModal
          isOpen={true}
          hbl={editingHBL()!}
          onClose={() => setEditingHBL(null)}
          onSave={async (updates) => {
            await updateHBL(editingHBL()!.referenceHId, updates);
            setEditingHBL(null);
          }}
        />
      </Show>
      */}
    </div>
  );
};

export default HBLListView;