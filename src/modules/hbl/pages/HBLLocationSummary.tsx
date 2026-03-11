import { Component, createSignal, onMount, For, Show, createMemo } from 'solid-js';
import { groupHBLsByLastLocation, LocationSummaryReport, getHBLsForLocation, SummaryFilters } from '../services/hblLocationSummaryService';
import { Card } from '../../ui';
import { devLog } from '../../../services/utils';

const HBLLocationSummary: Component = () => {
  const [report, setReport] = createSignal<LocationSummaryReport | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [expandedLocation, setExpandedLocation] = createSignal<string | null>(null);
  const [locationDetails, setLocationDetails] = createSignal<Array<{
    hbl: string;
    lastScannedAt: Date;
    scannedBy?: string;
  }>>([]);
  const [loadingDetails, setLoadingDetails] = createSignal(false);

  // Filter states
  const [searchTerm, setSearchTerm] = createSignal('230');
  const [guideFilter, setGuideFilter] = createSignal<string>('all');

  // Available guides
  const uniqueGuides = createMemo(() => {
    return [2518, 2519, 2520, 2521, 2522, 2523, 2524, 2525, 2526];
  });

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build filters object
      const filters: SummaryFilters = {
        searchTerm: searchTerm().trim() || '230',
        guia: guideFilter() !== 'all' ? guideFilter() : undefined
      };

      const summaryReport = await groupHBLsByLastLocation(filters);
      setReport(summaryReport);
    } catch (err) {
      devLog('Error loading location summary:', err);
      setError('Failed to load location summary');
    } finally {
      setLoading(false);
    }
  };

  const toggleLocationDetails = async (locationId: string) => {
    if (expandedLocation() === locationId) {
      setExpandedLocation(null);
      setLocationDetails([]);
    } else {
      setExpandedLocation(locationId);
      setLoadingDetails(true);
      try {
        // Build filters object
        const filters: SummaryFilters = {
          searchTerm: searchTerm().trim() || '230',
          guia: guideFilter() !== 'all' ? guideFilter() : undefined
        };

        const details = await getHBLsForLocation(locationId, filters);
        setLocationDetails(details);
      } catch (err) {
        devLog('Error loading location details:', err);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  onMount(() => {
    loadSummary();
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div style={{ padding: '2rem', 'max-width': '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        'margin-bottom': '2rem',
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center'
      }}>
        <div>
          <h1 style={{
            'font-size': '2rem',
            'font-weight': '700',
            'margin-bottom': '0.5rem',
            color: 'var(--text-primary)'
          }}>
            📊 HBL Location Summary
          </h1>
          <p style={{ color: 'var(--text-muted)', 'font-size': '1rem' }}>
            View all HBLs grouped by their last scanned location
          </p>
        </div>
        <button
          onClick={loadSummary}
          disabled={loading()}
          style={{
            padding: '0.75rem 1.5rem',
            background: loading() ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            'border-radius': '6px',
            cursor: loading() ? 'not-allowed' : 'pointer',
            'font-weight': '500',
            'font-size': '1rem'
          }}
        >
          {loading() ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <div style={{
          padding: '1.5rem',
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          'margin-bottom': '1rem'
        }}>
          {/* Guide Filter */}
          <div>
            <label style={{
              display: 'block',
              'margin-bottom': '0.5rem',
              'font-weight': '500',
              color: 'var(--text-primary)'
            }}>
              📋 Guide Number
            </label>
            <select
              value={guideFilter()}
              onChange={(e) => setGuideFilter(e.currentTarget.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': '6px',
                'font-family': 'inherit',
                background: 'var(--surface-color)'
              }}
            >
              <option value="all">All Guides</option>
              <For each={uniqueGuides()}>
                {(guide) => <option value={guide}>Guide No. {guide}</option>}
              </For>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label style={{
              display: 'block',
              'margin-bottom': '0.5rem',
              'font-weight': '500',
              color: 'var(--text-primary)'
            }}>
              🔍 Search HBL
            </label>
            <input
              type="text"
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              placeholder="Enter HBL prefix or number..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                'border-radius': '6px',
                'font-family': 'inherit',
                background: 'var(--surface-color)'
              }}
            />
          </div>

          {/* Search Button */}
          <div style={{
            display: 'flex',
            'align-items': 'flex-end'
          }}>
            <button
              onClick={loadSummary}
              disabled={loading()}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                background: loading() ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                'border-radius': '6px',
                cursor: loading() ? 'not-allowed' : 'pointer',
                'font-weight': '500',
                'font-size': '0.95rem'
              }}
            >
              {loading() ? '⏳ Searching...' : '🔍 Search'}
            </button>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      <Show when={error()}>
        <Card>
          <div style={{
            padding: '1rem',
            background: '#f8d7da',
            color: '#721c24',
            'border-radius': '6px',
            'text-align': 'center'
          }}>
            ❌ {error()}
          </div>
        </Card>
      </Show>

      {/* Loading State */}
      <Show when={loading() && !report()}>
        <Card>
          <div style={{
            padding: '4rem',
            'text-align': 'center',
            color: 'var(--text-muted)'
          }}>
            <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>📦</div>
            <div>Loading HBL location summary...</div>
          </div>
        </Card>
      </Show>

      {/* Summary Stats */}
      <Show when={report() && !loading()}>
        <div style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          'margin-bottom': '2rem'
        }}>
          <Card>
            <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
              <div style={{
                'font-size': '2.5rem',
                'font-weight': '700',
                color: '#007bff',
                'margin-bottom': '0.5rem'
              }}>
                {report()!.totalHBLs}
              </div>
              <div style={{ color: 'var(--text-muted)', 'font-size': '0.95rem' }}>
                Total HBLs
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
              <div style={{
                'font-size': '2.5rem',
                'font-weight': '700',
                color: '#28a745',
                'margin-bottom': '0.5rem'
              }}>
                {report()!.locations.length}
              </div>
              <div style={{ color: 'var(--text-muted)', 'font-size': '0.95rem' }}>
                Active Locations
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ padding: '1.5rem', 'text-align': 'center' }}>
              <div style={{
                'font-size': '1rem',
                'font-weight': '500',
                color: 'var(--text-muted)',
                'margin-bottom': '0.5rem'
              }}>
                Last Updated
              </div>
              <div style={{ 'font-size': '0.9rem', color: 'var(--text-primary)' }}>
                {formatDate(report()!.lastUpdated)}
              </div>
            </div>
          </Card>
        </div>

        {/* Locations Table */}
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h2 style={{
              'font-size': '1.25rem',
              'font-weight': '600',
              'margin-bottom': '1.5rem'
            }}>
              HBLs by Location
            </h2>

            <div style={{ 'overflow-x': 'auto' }}>
              <table style={{
                width: '100%',
                'border-collapse': 'collapse',
                'font-size': '0.95rem'
              }}>
                <thead>
                  <tr style={{
                    background: '#f8f9fa',
                    'border-bottom': '2px solid #dee2e6'
                  }}>
                    <th style={{
                      padding: '1rem',
                      'text-align': 'left',
                      'font-weight': '600',
                      color: 'var(--text-primary)'
                    }}>
                      Location
                    </th>
                    <th style={{
                      padding: '1rem',
                      'text-align': 'center',
                      'font-weight': '600',
                      color: 'var(--text-primary)'
                    }}>
                      HBL Count
                    </th>
                    <th style={{
                      padding: '1rem',
                      'text-align': 'center',
                      'font-weight': '600',
                      color: 'var(--text-primary)'
                    }}>
                      Percentage
                    </th>
                    <th style={{
                      padding: '1rem',
                      'text-align': 'center',
                      'font-weight': '600',
                      color: 'var(--text-primary)'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={report()!.locations}>
                    {(location) => {
                      const percentage = ((location.hblCount / report()!.totalHBLs) * 100).toFixed(1);
                      const isExpanded = expandedLocation() === location.locationId;

                      return (
                        <>
                          <tr style={{
                            'border-bottom': '1px solid #dee2e6',
                            background: isExpanded ? '#e7f3ff' : 'white',
                            transition: 'background 0.2s'
                          }}>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ 'font-weight': '500' }}>
                                {location.locationLabel}
                              </div>
                              <div style={{
                                'font-size': '0.85rem',
                                color: 'var(--text-muted)',
                                'margin-top': '0.25rem'
                              }}>
                                {location.locationId}
                              </div>
                            </td>
                            <td style={{
                              padding: '1rem',
                              'text-align': 'center',
                              'font-weight': '600',
                              'font-size': '1.1rem',
                              color: '#007bff'
                            }}>
                              {location.hblCount}
                            </td>
                            <td style={{
                              padding: '1rem',
                              'text-align': 'center'
                            }}>
                              <div style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.75rem',
                                background: '#e7f3ff',
                                'border-radius': '12px',
                                'font-weight': '500',
                                color: '#007bff'
                              }}>
                                {percentage}%
                              </div>
                            </td>
                            <td style={{
                              padding: '1rem',
                              'text-align': 'center'
                            }}>
                              <button
                                onClick={() => toggleLocationDetails(location.locationId)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: isExpanded ? '#dc3545' : '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  'border-radius': '4px',
                                  cursor: 'pointer',
                                  'font-size': '0.85rem'
                                }}
                              >
                                {isExpanded ? '▲ Hide' : '▼ View HBLs'}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          <Show when={isExpanded}>
                            <tr>
                              <td colspan="4" style={{ padding: '0' }}>
                                <div style={{
                                  background: '#f8f9fa',
                                  padding: '1.5rem',
                                  'border-top': '1px solid #dee2e6'
                                }}>
                                  <h4 style={{
                                    'margin-bottom': '1rem',
                                    'font-size': '1rem',
                                    'font-weight': '600'
                                  }}>
                                    HBLs in {location.locationLabel}
                                  </h4>

                                  <Show when={loadingDetails()} fallback={
                                    <div style={{
                                      'max-height': '400px',
                                      'overflow-y': 'auto'
                                    }}>
                                      <table style={{
                                        width: '100%',
                                        'border-collapse': 'collapse',
                                        background: 'white',
                                        'border-radius': '4px',
                                        overflow: 'hidden'
                                      }}>
                                        <thead>
                                          <tr style={{ background: '#e9ecef' }}>
                                            <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.85rem' }}>
                                              HBL Number
                                            </th>
                                            <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.85rem' }}>
                                              Last Scanned
                                            </th>
                                            <th style={{ padding: '0.75rem', 'text-align': 'left', 'font-size': '0.85rem' }}>
                                              Scanned By
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <For each={locationDetails()}>
                                            {(hblDetail) => (
                                              <tr style={{ 'border-bottom': '1px solid #e9ecef' }}>
                                                <td style={{ padding: '0.75rem', 'font-family': 'monospace', 'font-size': '0.9rem' }}>
                                                  {hblDetail.hbl}
                                                </td>
                                                <td style={{ padding: '0.75rem', 'font-size': '0.85rem', color: 'var(--text-muted)' }}>
                                                  {formatDate(hblDetail.lastScannedAt)}
                                                </td>
                                                <td style={{ padding: '0.75rem', 'font-size': '0.85rem' }}>
                                                  {hblDetail.scannedBy || '-'}
                                                </td>
                                              </tr>
                                            )}
                                          </For>
                                        </tbody>
                                      </table>
                                    </div>
                                  }>
                                    <div style={{ padding: '2rem', 'text-align': 'center' }}>
                                      Loading HBL details...
                                    </div>
                                  </Show>
                                </div>
                              </td>
                            </tr>
                          </Show>
                        </>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </Show>
    </div>
  );
};

export default HBLLocationSummary;
