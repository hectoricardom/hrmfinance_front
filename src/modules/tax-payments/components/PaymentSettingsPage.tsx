/**
 * Payment Settings Page Component
 * Admin page for configuring fee schedules and business receipt info
 */

import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Button, FormInput } from '../../ui';
import type { PaymentSettings, FeeScheduleItem, FeeSchedule } from '../types/paymentTypes';
import { DEFAULT_FEE_SCHEDULE_ITEMS } from '../types/paymentTypes';
import { paymentStore } from '../stores/paymentStore';
import { formatCurrency } from '../services/paymentService';

const CATEGORY_LABELS: Record<string, string> = {
  base: 'Base',
  form: 'Forms',
  schedule: 'Schedules',
  credit: 'Credits',
  state: 'State',
  other: 'Other',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const PaymentSettingsPage: Component = () => {
  const [settings, setSettings] = createStore<PaymentSettings>(
    (paymentStore.state.feeSettings || {
      id: '',
      businessId: '',
      feeSchedule: {
        id: 'default',
        taxYear: new Date().getFullYear(),
        name: 'Standard Fee Schedule',
        items: [...DEFAULT_FEE_SCHEDULE_ITEMS],
        minimumFee: 100,
        returningClientDiscount: 10,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      businessName: 'Stephanie Solutions',
      businessAddress: '',
      businessCity: '',
      businessState: '',
      businessZip: '',
      businessPhone: '',
      allowPartialPayments: true,
      allowDeductFromRefund: true,
      autoCalculateFees: true,
      receiptThankYouMessage: 'Thank you for choosing our services!',
      receiptThankYouMessageEs: 'Gracias por elegir nuestros servicios!',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }) as PaymentSettings
  );

  const [activeTab, setActiveTab] = createSignal<'fees' | 'business' | 'receipt' | 'preview'>('fees');
  const [hasChanges, setHasChanges] = createSignal(false);
  const [showAddItem, setShowAddItem] = createSignal(false);
  const [newItem, setNewItem] = createStore<Partial<FeeScheduleItem>>({
    formType: '',
    basePrice: 0,
    description: '',
    descriptionEs: '',
    category: 'other',
    perUnit: false,
  });
  const [selectedTaxYear, setSelectedTaxYear] = createSignal(new Date().getFullYear());

  // Load settings on mount
  createEffect(async () => {
    if (!paymentStore.state.settingsLoaded) {
      await paymentStore.loadSettings();
    }
    if (paymentStore.state.feeSettings) {
      setSettings(paymentStore.state.feeSettings);
      setSelectedTaxYear(paymentStore.state.feeSettings.feeSchedule.taxYear);
    }
  });

  const handleFieldChange = (field: string, value: any) => {
    setSettings(field as any, value);
    setHasChanges(true);
  };

  const handleFeeScheduleChange = (field: string, value: any) => {
    setSettings('feeSchedule', field as any, value);
    setHasChanges(true);
  };

  const handleItemPriceChange = (itemId: string, newPrice: number) => {
    setSettings('feeSchedule', 'items', (item: FeeScheduleItem) => item.id === itemId, 'basePrice', newPrice);
    setHasChanges(true);
  };

  const handleItemDescriptionChange = (itemId: string, description: string) => {
    setSettings('feeSchedule', 'items', (item: FeeScheduleItem) => item.id === itemId, 'description', description);
    setHasChanges(true);
  };

  const handleRemoveItem = (itemId: string) => {
    setSettings('feeSchedule', 'items', (items: FeeScheduleItem[]) =>
      items.filter((i) => i.id !== itemId)
    );
    setHasChanges(true);
  };

  const handleAddItem = () => {
    if (!newItem.formType || !newItem.description || !newItem.basePrice) return;

    const item: FeeScheduleItem = {
      id: `custom_${Date.now()}`,
      formType: newItem.formType!,
      basePrice: newItem.basePrice!,
      description: newItem.description!,
      descriptionEs: newItem.descriptionEs || '',
      category: (newItem.category as FeeScheduleItem['category']) || 'other',
      perUnit: newItem.perUnit || false,
    };

    setSettings('feeSchedule', 'items', (items: FeeScheduleItem[]) => [...items, item]);
    setShowAddItem(false);
    setNewItem({
      formType: '',
      basePrice: 0,
      description: '',
      descriptionEs: '',
      category: 'other',
      perUnit: false,
    });
    setHasChanges(true);
  };

  const handleTaxYearChange = (year: number) => {
    setSelectedTaxYear(year);
    handleFeeScheduleChange('taxYear', year);
  };

  const handleSave = async () => {
    try {
      await paymentStore.saveSettings(settings as PaymentSettings);
      setHasChanges(false);
    } catch (err) {
      // Error is handled in the store
    }
  };

  const handleResetDefaults = () => {
    setSettings('feeSchedule', 'items', [...DEFAULT_FEE_SCHEDULE_ITEMS]);
    setSettings('feeSchedule', 'minimumFee', 100);
    setSettings('feeSchedule', 'returningClientDiscount', 10);
    setHasChanges(true);
  };

  // Styles
  const pageContainerStyle = {
    'max-width': '900px',
    margin: '0 auto',
    padding: '1.5rem',
  };

  const pageTitleStyle = {
    'font-size': '1.5rem',
    'font-weight': '700',
    color: 'var(--text-primary, #1f2937)',
    'margin-bottom': '1.5rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.75rem',
  };

  const tabBarStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-bottom': '1.5rem',
    'border-bottom': '2px solid var(--border-color, #e5e7eb)',
    'padding-bottom': '0.5rem',
    'overflow-x': 'auto' as const,
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: isActive ? '#1a73e8' : 'transparent',
    color: isActive ? 'white' : 'var(--text-primary, #1f2937)',
    'border-radius': 'var(--border-radius-md, 8px)',
    cursor: 'pointer',
    'font-weight': '600',
    'font-size': '0.875rem',
    transition: 'all 0.2s',
    'white-space': 'nowrap' as const,
  });

  const sectionStyle = {
    background: 'var(--surface-color, #fff)',
    'border-radius': 'var(--border-radius-md, 8px)',
    border: '1px solid var(--border-color, #e5e7eb)',
    padding: '1.5rem',
    'margin-bottom': '1.5rem',
  };

  const sectionTitleStyle = {
    'font-size': '1.125rem',
    'font-weight': '600',
    color: 'var(--text-primary, #1f2937)',
    'margin-bottom': '1rem',
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
  };

  const gridStyle = {
    display: 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
  };

  const thStyle = {
    'text-align': 'left' as const,
    padding: '0.75rem',
    'border-bottom': '2px solid var(--border-color, #e5e7eb)',
    'font-weight': '600',
    'font-size': '0.8rem',
    color: 'var(--text-secondary, #6b7280)',
    'text-transform': 'uppercase' as const,
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color, #e5e7eb)',
    'font-size': '0.875rem',
    'vertical-align': 'middle' as const,
  };

  const priceInputStyle = {
    width: '100px',
    padding: '0.5rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius-md, 8px)',
    'text-align': 'right' as const,
    'font-size': '0.875rem',
    background: 'var(--surface-color, #fff)',
    color: 'var(--text-primary, #1f2937)',
  };

  const descInputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius-md, 8px)',
    'font-size': '0.875rem',
    background: 'var(--surface-color, #fff)',
    color: 'var(--text-primary, #1f2937)',
  };

  const removeBtnStyle = {
    padding: '0.4rem 0.6rem',
    border: '1px solid #ef4444',
    'border-radius': 'var(--border-radius-md, 8px)',
    background: 'transparent',
    color: '#ef4444',
    cursor: 'pointer',
    'font-size': '0.75rem',
    transition: 'all 0.2s',
  };

  const categoryBadgeStyle = (category: string) => {
    const colors: Record<string, string> = {
      base: '#1a73e8',
      form: '#8b5cf6',
      schedule: '#f59e0b',
      credit: '#22c55e',
      state: '#06b6d4',
      other: '#6b7280',
    };
    return {
      display: 'inline-block',
      padding: '0.2rem 0.5rem',
      background: `${colors[category] || '#6b7280'}15`,
      color: colors[category] || '#6b7280',
      'border-radius': '9999px',
      'font-size': '0.7rem',
      'font-weight': '600',
    };
  };

  const addItemFormStyle = {
    padding: '1rem',
    background: 'var(--background-color, #f9fafb)',
    'border-radius': 'var(--border-radius-md, 8px)',
    'margin-top': '1rem',
    border: '1px solid var(--border-color, #e5e7eb)',
  };

  const inputFullStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius-md, 8px)',
    'font-size': '0.875rem',
    'box-sizing': 'border-box' as const,
    'margin-top': '0.5rem',
    background: 'var(--surface-color, #fff)',
    color: 'var(--text-primary, #1f2937)',
  };

  const selectStyle = {
    ...inputFullStyle,
  };

  const labelSmStyle = {
    'font-weight': '500',
    'font-size': '0.8rem',
    color: 'var(--text-secondary, #6b7280)',
    display: 'block',
    'margin-top': '0.75rem',
  };

  const checkboxContainerStyle = {
    display: 'flex',
    'align-items': 'center',
    gap: '0.5rem',
    'margin-top': '0.75rem',
  };

  const footerActionsStyle = {
    display: 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'padding-top': '1rem',
    'border-top': '2px solid var(--border-color, #e5e7eb)',
    'margin-top': '1rem',
  };

  const yearSelectorStyle = {
    display: 'flex',
    gap: '0.5rem',
    'margin-bottom': '1rem',
  };

  const yearBtnStyle = (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    border: `2px solid ${isActive ? '#1a73e8' : 'var(--border-color, #e5e7eb)'}`,
    'border-radius': 'var(--border-radius-md, 8px)',
    background: isActive ? '#1a73e8' : 'transparent',
    color: isActive ? 'white' : 'var(--text-primary, #1f2937)',
    cursor: 'pointer',
    'font-weight': '600',
    'font-size': '0.875rem',
    transition: 'all 0.2s',
  });

  // Receipt preview styles
  const previewContainerStyle = {
    'max-width': '400px',
    margin: '0 auto',
    padding: '2rem',
    background: '#fff',
    border: '1px solid var(--border-color, #e5e7eb)',
    'border-radius': 'var(--border-radius-md, 8px)',
    'font-family': "'Courier New', Courier, monospace",
    'font-size': '0.85rem',
  };

  return (
    <div style={pageContainerStyle}>
      {/* Page Title */}
      <div style={pageTitleStyle}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
        Payment Settings
      </div>

      {/* Error Display */}
      <Show when={paymentStore.state.error}>
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', 'border-radius': 'var(--border-radius-md, 8px)', 'margin-bottom': '1rem' }}>
          {paymentStore.state.error}
        </div>
      </Show>

      {/* Tabs */}
      <div style={tabBarStyle}>
        <button style={tabStyle(activeTab() === 'fees')} onClick={() => setActiveTab('fees')}>
          Fee Schedule
        </button>
        <button style={tabStyle(activeTab() === 'business')} onClick={() => setActiveTab('business')}>
          Business Info
        </button>
        <button style={tabStyle(activeTab() === 'receipt')} onClick={() => setActiveTab('receipt')}>
          Receipt Settings
        </button>
        <button style={tabStyle(activeTab() === 'preview')} onClick={() => setActiveTab('preview')}>
          Preview Receipt
        </button>
      </div>

      {/* Fee Schedule Tab */}
      <Show when={activeTab() === 'fees'}>
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            Fee Schedule
          </div>

          {/* Tax Year Selector */}
          <div style={yearSelectorStyle}>
            <For each={[2024, 2025, 2026]}>
              {(year) => (
                <button
                  style={yearBtnStyle(selectedTaxYear() === year)}
                  onClick={() => handleTaxYearChange(year)}
                >
                  {year}
                </button>
              )}
            </For>
          </div>

          {/* Fee Items Table */}
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Description</th>
                <th style={{ ...thStyle, 'text-align': 'center' }}>Per Unit</th>
                <th style={{ ...thStyle, 'text-align': 'right' }}>Price</th>
                <th style={{ ...thStyle, 'text-align': 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              <For each={settings.feeSchedule?.items || []}>
                {(item) => (
                  <tr>
                    <td style={tdStyle}>
                      <span style={categoryBadgeStyle(item.category)}>
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        style={descInputStyle}
                        value={item.description}
                        onInput={(e) => handleItemDescriptionChange(item.id, e.currentTarget.value)}
                      />
                    </td>
                    <td style={{ ...tdStyle, 'text-align': 'center' }}>
                      {item.perUnit ? 'Yes' : '-'}
                    </td>
                    <td style={{ ...tdStyle, 'text-align': 'right' }}>
                      <input
                        type="number"
                        style={priceInputStyle}
                        value={item.basePrice}
                        onInput={(e) => handleItemPriceChange(item.id, parseFloat(e.currentTarget.value) || 0)}
                        min="0"
                        step="5"
                      />
                    </td>
                    <td style={{ ...tdStyle, 'text-align': 'center' }}>
                      <Show when={item.category !== 'base'}>
                        <button
                          style={removeBtnStyle}
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          Remove
                        </button>
                      </Show>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>

          {/* Add Item */}
          <Show when={!showAddItem()}>
            <Button variant="secondary" onClick={() => setShowAddItem(true)} style={{ 'margin-top': '1rem' }}>
              + Add Fee Item
            </Button>
          </Show>

          <Show when={showAddItem()}>
            <div style={addItemFormStyle}>
              <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Add New Fee Item</div>
              <div style={gridStyle}>
                <div>
                  <label style={labelSmStyle}>Form Type ID</label>
                  <input
                    type="text"
                    style={inputFullStyle}
                    value={newItem.formType || ''}
                    onInput={(e) => setNewItem('formType', e.currentTarget.value)}
                    placeholder="e.g., custom_form"
                  />
                </div>
                <div>
                  <label style={labelSmStyle}>Category</label>
                  <select
                    style={selectStyle}
                    value={newItem.category || 'other'}
                    onChange={(e) => setNewItem('category', e.target.value as FeeScheduleItem['category'])}
                  >
                    <For each={CATEGORY_OPTIONS}>
                      {(opt) => <option value={opt.value}>{opt.label}</option>}
                    </For>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelSmStyle}>Description (EN)</label>
                <input
                  type="text"
                  style={inputFullStyle}
                  value={newItem.description || ''}
                  onInput={(e) => setNewItem('description', e.currentTarget.value)}
                  placeholder="Fee item description..."
                />
              </div>
              <div>
                <label style={labelSmStyle}>Description (ES)</label>
                <input
                  type="text"
                  style={inputFullStyle}
                  value={newItem.descriptionEs || ''}
                  onInput={(e) => setNewItem('descriptionEs', e.currentTarget.value)}
                  placeholder="Descripcion del cargo..."
                />
              </div>
              <div style={gridStyle}>
                <div>
                  <label style={labelSmStyle}>Price ($)</label>
                  <input
                    type="number"
                    style={inputFullStyle}
                    value={newItem.basePrice || 0}
                    onInput={(e) => setNewItem('basePrice', parseFloat(e.currentTarget.value) || 0)}
                    min="0"
                    step="5"
                  />
                </div>
                <div style={checkboxContainerStyle}>
                  <input
                    type="checkbox"
                    checked={newItem.perUnit || false}
                    onChange={(e) => setNewItem('perUnit', e.currentTarget.checked)}
                    id="perUnit"
                  />
                  <label for="perUnit" style={{ 'font-size': '0.875rem', cursor: 'pointer' }}>
                    Per Unit (multiply by quantity)
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', 'margin-top': '1rem' }}>
                <Button onClick={handleAddItem}>Add Item</Button>
                <Button variant="secondary" onClick={() => setShowAddItem(false)}>Cancel</Button>
              </div>
            </div>
          </Show>

          {/* Minimum Fee & Discount */}
          <div style={{ ...gridStyle, 'margin-top': '1.5rem', 'padding-top': '1rem', 'border-top': '1px solid var(--border-color, #e5e7eb)' }}>
            <div>
              <FormInput
                label="Minimum Fee ($)"
                type="number"
                value={settings.feeSchedule?.minimumFee?.toString() || '100'}
                onChange={(value: string) => handleFeeScheduleChange('minimumFee', parseFloat(value) || 0)}
              />
            </div>
            <div>
              <FormInput
                label="Returning Client Discount (%)"
                type="number"
                value={settings.feeSchedule?.returningClientDiscount?.toString() || '10'}
                onChange={(value: string) => handleFeeScheduleChange('returningClientDiscount', parseFloat(value) || 0)}
              />
            </div>
          </div>

          {/* Reset to defaults */}
          <div style={{ 'margin-top': '1rem' }}>
            <Button variant="secondary" onClick={handleResetDefaults}>
              Reset to Default Fees
            </Button>
          </div>
        </div>
      </Show>

      {/* Business Info Tab */}
      <Show when={activeTab() === 'business'}>
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Business Information
          </div>
          <p style={{ 'font-size': '0.875rem', color: 'var(--text-secondary, #6b7280)', 'margin-bottom': '1rem' }}>
            This information appears on receipts and fee estimates.
          </p>

          <div style={gridStyle}>
            <FormInput
              label="Business Name"
              value={settings.businessName || ''}
              onChange={(value: string) => handleFieldChange('businessName', value)}
            />
            <FormInput
              label="Phone Number"
              value={settings.businessPhone || ''}
              onChange={(value: string) => handleFieldChange('businessPhone', value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div style={{ 'margin-top': '1rem' }}>
            <FormInput
              label="Street Address"
              value={settings.businessAddress || ''}
              onChange={(value: string) => handleFieldChange('businessAddress', value)}
            />
          </div>

          <div style={{ ...gridStyle, 'margin-top': '1rem' }}>
            <FormInput
              label="City"
              value={settings.businessCity || ''}
              onChange={(value: string) => handleFieldChange('businessCity', value)}
            />
            <FormInput
              label="State"
              value={settings.businessState || ''}
              onChange={(value: string) => handleFieldChange('businessState', value)}
              placeholder="TX"
            />
            <FormInput
              label="ZIP Code"
              value={settings.businessZip || ''}
              onChange={(value: string) => handleFieldChange('businessZip', value)}
            />
          </div>

          <div style={{ ...gridStyle, 'margin-top': '1rem' }}>
            <FormInput
              label="EIN (optional)"
              value={settings.businessEin || ''}
              onChange={(value: string) => handleFieldChange('businessEin', value)}
              placeholder="XX-XXXXXXX"
            />
          </div>

          {/* Preferences */}
          <div style={{ 'margin-top': '1.5rem', 'padding-top': '1rem', 'border-top': '1px solid var(--border-color, #e5e7eb)' }}>
            <div style={{ 'font-weight': '600', 'margin-bottom': '0.75rem' }}>Preferences</div>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.allowPartialPayments}
                  onChange={(e) => handleFieldChange('allowPartialPayments', e.currentTarget.checked)}
                />
                <span style={{ 'font-size': '0.875rem' }}>Allow partial payments</span>
              </label>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.allowDeductFromRefund}
                  onChange={(e) => handleFieldChange('allowDeductFromRefund', e.currentTarget.checked)}
                />
                <span style={{ 'font-size': '0.875rem' }}>Allow "Deduct from Refund" payment method</span>
              </label>
              <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.autoCalculateFees}
                  onChange={(e) => handleFieldChange('autoCalculateFees', e.currentTarget.checked)}
                />
                <span style={{ 'font-size': '0.875rem' }}>Auto-calculate fees based on return complexity</span>
              </label>
            </div>
          </div>
        </div>
      </Show>

      {/* Receipt Settings Tab */}
      <Show when={activeTab() === 'receipt'}>
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Receipt Customization
          </div>

          <div>
            <FormInput
              label="Thank You Message (English)"
              value={settings.receiptThankYouMessage || ''}
              onChange={(value: string) => handleFieldChange('receiptThankYouMessage', value)}
            />
          </div>
          <div style={{ 'margin-top': '1rem' }}>
            <FormInput
              label="Thank You Message (Spanish)"
              value={settings.receiptThankYouMessageEs || ''}
              onChange={(value: string) => handleFieldChange('receiptThankYouMessageEs', value)}
            />
          </div>
          <div style={{ 'margin-top': '1rem' }}>
            <FormInput
              label="Footer Note (English, optional)"
              value={settings.receiptFooterNote || ''}
              onChange={(value: string) => handleFieldChange('receiptFooterNote', value)}
              placeholder="e.g., For questions, please call..."
            />
          </div>
          <div style={{ 'margin-top': '1rem' }}>
            <FormInput
              label="Footer Note (Spanish, optional)"
              value={settings.receiptFooterNoteEs || ''}
              onChange={(value: string) => handleFieldChange('receiptFooterNoteEs', value)}
              placeholder="e.g., Para preguntas, por favor llame..."
            />
          </div>
        </div>
      </Show>

      {/* Preview Receipt Tab */}
      <Show when={activeTab() === 'preview'}>
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Receipt Template Preview</div>
          <div style={previewContainerStyle}>
            {/* Business Header */}
            <div style={{ 'text-align': 'center', 'margin-bottom': '1rem', 'padding-bottom': '1rem', 'border-bottom': '2px dashed #d1d5db' }}>
              <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: '#1a73e8', 'font-family': 'Arial, sans-serif' }}>
                {settings.businessName || 'Business Name'}
              </div>
              <div style={{ 'font-size': '0.75rem', color: '#6b7280', 'line-height': '1.5' }}>
                <Show when={settings.businessAddress}>
                  <div>{settings.businessAddress}</div>
                </Show>
                <Show when={settings.businessCity}>
                  <div>
                    {settings.businessCity}
                    {settings.businessState ? `, ${settings.businessState}` : ''}
                    {settings.businessZip ? ` ${settings.businessZip}` : ''}
                  </div>
                </Show>
                <Show when={settings.businessPhone}>
                  <div>Tel: {settings.businessPhone}</div>
                </Show>
              </div>
            </div>

            <div style={{ 'text-align': 'center', 'font-weight': '700', 'margin-bottom': '1rem', 'text-transform': 'uppercase', 'letter-spacing': '0.1em' }}>
              RECEIPT / RECIBO
            </div>
            <div style={{ 'text-align': 'center', 'font-size': '0.75rem', color: '#6b7280', 'margin-bottom': '1rem' }}>
              #RCP-{new Date().getFullYear()}-XXXXXX
            </div>

            <div style={{ 'margin-bottom': '1rem', 'padding-bottom': '0.75rem', 'border-bottom': '1px dashed #d1d5db' }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '0.8rem' }}>
                <span style={{ color: '#6b7280' }}>Client:</span>
                <span style={{ 'font-weight': '600' }}>John Doe</span>
              </div>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '0.8rem' }}>
                <span style={{ color: '#6b7280' }}>Date:</span>
                <span style={{ 'font-weight': '600' }}>{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div style={{ 'margin-bottom': '0.75rem' }}>
              <div style={{ 'font-weight': '600', 'font-size': '0.85rem' }}>Tax Return Preparation {selectedTaxYear()}</div>
            </div>

            <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '0.85rem', 'padding': '0.5rem', background: '#f0fdf4', 'border-radius': '4px', 'font-weight': '700' }}>
              <span>Total</span>
              <span>{formatCurrency(settings.feeSchedule?.items?.[0]?.basePrice || 150)}</span>
            </div>

            <div style={{ 'text-align': 'center', 'margin-top': '1rem', 'padding-top': '0.75rem', 'border-top': '2px dashed #d1d5db' }}>
              <div style={{ 'font-size': '0.85rem', 'font-weight': '600', color: '#1a73e8', 'font-family': 'Arial, sans-serif' }}>
                {settings.receiptThankYouMessage || 'Thank you!'}
              </div>
              <div style={{ 'font-size': '0.85rem', color: '#6b7280', 'font-family': 'Arial, sans-serif' }}>
                {settings.receiptThankYouMessageEs || 'Gracias!'}
              </div>
              <Show when={settings.receiptFooterNote}>
                <div style={{ 'margin-top': '0.5rem', 'font-size': '0.7rem', color: '#9ca3af' }}>
                  {settings.receiptFooterNote}
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* Footer Actions */}
      <Show when={hasChanges()}>
        <div style={footerActionsStyle}>
          <span style={{ 'font-size': '0.875rem', color: '#f59e0b', 'font-weight': '500' }}>
            You have unsaved changes
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => {
              if (paymentStore.state.feeSettings) {
                setSettings(paymentStore.state.feeSettings);
              }
              setHasChanges(false);
            }}>
              Discard
            </Button>
            <Button onClick={handleSave} disabled={paymentStore.state.isSaving}>
              {paymentStore.state.isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default PaymentSettingsPage;
