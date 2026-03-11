/**
 * Product Offers Comparison Component
 * Compare product offers from different suppliers via PDF/CSV uploads
 */

import { Component, createSignal, createMemo, Show, For } from 'solid-js';
import { Card, Button } from '../../ui';
import {
  SupplierOffer,
  ProductOffer,
  ProductComparison,
  CSVParserConfig,
  defaultCSVConfig,
  normalizeProductName,
} from '../types/productOffer';
import { parseCSVFile, detectDelimiter, suggestColumnMapping } from '../services/csvParser';
import { parsePDFFile, parseTextContent, extractTextFromPDF } from '../services/pdfParser';
import { offersStore } from '../stores/offersStore';
import { getMatchQualityDisplay, getScoreDisplay } from '../services/productMatcher';
import {
  analyzePdfWithAI,
  analyzeCsvWithAI,
  fileToBase64,
  getDefaultB2BPrompt,
  parseAIResponse,
  createOfferFromAIProducts,
} from '../services/aiAnalyzer';

type ViewMode = 'upload' | 'compare' | 'details';
type InputMode = 'file' | 'text' | 'ai' | 'json' | 'pdf-map';
type SortField = 'name' | 'bestPrice' | 'savings' | 'suppliers';
type SortDirection = 'asc' | 'desc';

interface JsonFieldMapping {
  productName: string;
  productCode: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  category: string;
}

const ProductOffersComparison: Component = () => {
  const [viewMode, setViewMode] = createSignal<ViewMode>('upload');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);

  // Upload state
  const [inputMode, setInputMode] = createSignal<InputMode>('file');
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [supplierName, setSupplierName] = createSignal('');
  const [fileType, setFileType] = createSignal<'csv' | 'pdf'>('csv');
  const [manualText, setManualText] = createSignal('');

  // CSV config
  const [csvConfig, setCsvConfig] = createSignal<CSVParserConfig>(defaultCSVConfig);
  const [showAdvancedConfig, setShowAdvancedConfig] = createSignal(false);
  const [detectedHeaders, setDetectedHeaders] = createSignal<string[]>([]);

  // AI Analysis state
  const [aiFile, setAiFile] = createSignal<File | null>(null);
  const [aiPrompt, setAiPrompt] = createSignal(getDefaultB2BPrompt());
  const [aiFileType, setAiFileType] = createSignal<'pdf' | 'csv'>('pdf');
  const [aiAnalyzing, setAiAnalyzing] = createSignal(false);

  // JSON input state
  const [jsonText, setJsonText] = createSignal('');
  const [jsonData, setJsonData] = createSignal<any[]>([]);
  const [jsonFields, setJsonFields] = createSignal<string[]>([]);
  const [jsonFieldMapping, setJsonFieldMapping] = createSignal<JsonFieldMapping>({
    productName: '',
    productCode: '',
    quantity: '',
    unit: '',
    unitPrice: '',
    totalPrice: '',
    category: '',
  });
  const [jsonPreview, setJsonPreview] = createSignal<any[]>([]);

  // PDF field mapping state
  const [pdfFile, setPdfFile] = createSignal<File | null>(null);
  const [pdfRows, setPdfRows] = createSignal<string[][]>([]);
  const [pdfHeaders, setPdfHeaders] = createSignal<string[]>([]);
  const [pdfFieldMapping, setPdfFieldMapping] = createSignal<JsonFieldMapping>({
    productName: '',
    productCode: '',
    quantity: '',
    unit: '',
    unitPrice: '',
    totalPrice: '',
    category: '',
  });
  const [pdfPreview, setPdfPreview] = createSignal<string[][]>([]);
  const [pdfHasHeader, setPdfHasHeader] = createSignal(true);
  const [pdfParsing, setPdfParsing] = createSignal(false);

  // Comparison state
  const [sortField, setSortField] = createSignal<SortField>('savings');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('desc');
  const [filterCategory, setFilterCategory] = createSignal<string>('');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedProduct, setSelectedProduct] = createSignal<ProductComparison | null>(null);

  // Get data from store
  const supplierOffers = () => offersStore.offers();
  const comparisons = () => offersStore.compareProducts();
  const comparisonResult = () => offersStore.getComparisonResult();

  // Get unique categories
  const categories = createMemo(() => {
    const cats = new Set<string>();
    supplierOffers().forEach(offer => {
      offer.products.forEach(p => {
        if (p.category) cats.add(p.category);
      });
    });
    return Array.from(cats).sort();
  });

  // Filter and sort comparisons
  const filteredComparisons = createMemo(() => {
    let result = comparisons();

    // Filter by search term
    if (searchTerm()) {
      const term = searchTerm().toLowerCase();
      result = result.filter(c =>
        c.productName.toLowerCase().includes(term) ||
        c.normalizedName.includes(term) ||
        (c.productCode && c.productCode.toLowerCase().includes(term))
      );
    }

    // Filter by category
    if (filterCategory()) {
      result = result.filter(c => c.category === filterCategory());
    }

    // Sort
    const field = sortField();
    const dir = sortDirection();
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.productName.localeCompare(b.productName);
          break;
        case 'bestPrice':
          comparison = (a.bestOffer?.price || 0) - (b.bestOffer?.price || 0);
          break;
        case 'savings':
          const savingsA = a.priceRange.max - a.priceRange.min;
          const savingsB = b.priceRange.max - b.priceRange.min;
          comparison = savingsA - savingsB;
          break;
        case 'suppliers':
          comparison = a.offers.length - b.offers.length;
          break;
      }
      return dir === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  // Handle file selection
  const handleFileSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);

    // Detect file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      setFileType('pdf');
    } else {
      setFileType('csv');

      // Try to detect CSV config
      try {
        const text = await file.text();
        const delimiter = detectDelimiter(text);
        const lines = text.split('\n');
        if (lines.length > 0) {
          const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
          setDetectedHeaders(headers);

          const suggestedMapping = suggestColumnMapping(headers);
          setCsvConfig(prev => ({
            ...prev,
            delimiter,
            columnMapping: { ...prev.columnMapping, ...suggestedMapping }
          }));
        }
      } catch (err) {
        console.error('Error detecting CSV config:', err);
      }
    }

    // Auto-suggest supplier name from filename
    if (!supplierName()) {
      const baseName = file.name.replace(/\.(csv|pdf)$/i, '');
      setSupplierName(baseName.replace(/[_-]/g, ' ').trim());
    }
  };

  // Parse and add offer
  const handleAddOffer = async () => {
    if (!supplierName()) {
      setError('Please enter a supplier name');
      return;
    }

    // Check input based on mode
    if (inputMode() === 'file') {
      const file = selectedFile();
      if (!file) {
        setError('Please select a file');
        return;
      }
    } else {
      if (!manualText().trim()) {
        setError('Please paste the product text');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let offer: SupplierOffer;

      if (inputMode() === 'text') {
        // Parse from manual text input
        offer = parseTextContent(manualText(), {}, supplierName());
      } else if (fileType() === 'csv') {
        offer = await parseCSVFile(selectedFile()!, csvConfig(), supplierName());
      } else {
        offer = await parsePDFFile(selectedFile()!, {}, supplierName());
      }

      if (offer.products.length === 0) {
        throw new Error(
          'No products found. Please check the format.\n\n' +
          'Expected format (one product per line):\n' +
          '• Product Name    $12.99\n' +
          '• Product Name    10    $25.00\n' +
          '• Product Name    10    kg    $2.50    $25.00'
        );
      }

      offersStore.addSupplierOffer(offer);

      setSuccessMessage(`Added ${offer.products.length} products from ${supplierName()}`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Reset form
      setSelectedFile(null);
      setSupplierName('');
      setManualText('');
      setDetectedHeaders([]);

      // Switch to compare view if we have multiple offers
      if (supplierOffers().length >= 2) {
        setViewMode('compare');
      }
    } catch (err) {
      console.error('Error parsing:', err);
      setError(err instanceof Error ? err.message : 'Error parsing input');
    } finally {
      setLoading(false);
    }
  };

  // Remove offer
  const handleRemoveOffer = (offerId: string) => {
    offersStore.removeSupplierOffer(offerId);
  };

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField() === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Format currency
  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(value);
  };

  // Calculate savings percentage
  const getSavingsPercent = (comparison: ProductComparison) => {
    if (comparison.priceRange.min === 0) return 0;
    return ((comparison.priceRange.max - comparison.priceRange.min) / comparison.priceRange.max) * 100;
  };

  // Styles
  const cardStyle = {
    padding: '1.5rem',
    'margin-bottom': '1rem'
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse',
    'font-size': '0.9rem'
  };

  const thStyle = {
    padding: '0.75rem',
    'text-align': 'left' as const,
    'border-bottom': '2px solid var(--border-color)',
    'font-weight': '600',
    background: 'var(--gray-50)',
    cursor: 'pointer'
  };

  const tdStyle = {
    padding: '0.75rem',
    'border-bottom': '1px solid var(--border-color)'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm)',
    'font-size': '1rem',
    background: 'var(--surface-color)'
  };

  const labelStyle = {
    display: 'block',
    'margin-bottom': '0.5rem',
    'font-weight': '500'
  };

  const tabStyle = (active: boolean) => ({
    padding: '0.75rem 1.5rem',
    background: active ? 'var(--primary-color)' : 'transparent',
    color: active ? 'white' : 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    'border-bottom': active ? 'none' : '1px solid var(--border-color)',
    'border-radius': 'var(--border-radius-sm) var(--border-radius-sm) 0 0',
    cursor: 'pointer',
    'font-weight': active ? '600' : '400'
  });

  return (
    <div style={{ padding: '1rem', 'max-width': '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
        'margin-bottom': '1.5rem'
      }}>
        <h1 style={{ 'font-size': '1.5rem', 'font-weight': '600' }}>
          Product Offers Comparison
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Show when={supplierOffers().length > 0}>
            <Button variant="outline" onClick={() => offersStore.clearAllOffers()}>
              Clear All
            </Button>
          </Show>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', 'margin-bottom': '1rem' }}>
        <button style={tabStyle(viewMode() === 'upload')} onClick={() => setViewMode('upload')}>
          Upload Offers ({supplierOffers().length})
        </button>
        <button
          style={tabStyle(viewMode() === 'compare')}
          onClick={() => setViewMode('compare')}
          disabled={supplierOffers().length < 2}
        >
          Compare Products
        </button>
      </div>

      {/* Messages */}
      <Show when={error()}>
        <div style={{
          padding: '1rem',
          background: 'var(--danger-light)',
          color: 'var(--danger-color)',
          'border-radius': 'var(--border-radius-sm)',
          'margin-bottom': '1rem'
        }}>
          {error()}
        </div>
      </Show>

      <Show when={successMessage()}>
        <div style={{
          padding: '1rem',
          background: 'var(--success-light)',
          color: 'var(--success-color)',
          'border-radius': 'var(--border-radius-sm)',
          'margin-bottom': '1rem'
        }}>
          {successMessage()}
        </div>
      </Show>

      {/* Upload View */}
      <Show when={viewMode() === 'upload'}>
        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '1.5rem' }}>
          {/* Upload Form */}
          <Card>
            <div style={cardStyle}>
              <h3 style={{ 'margin-bottom': '1.5rem', 'font-weight': '600' }}>
                Add Supplier Offer
              </h3>

              <div style={{ 'margin-bottom': '1rem' }}>
                <label style={labelStyle}>Supplier Name *</label>
                <input
                  type="text"
                  value={supplierName()}
                  onInput={(e) => setSupplierName(e.currentTarget.value)}
                  style={inputStyle}
                  placeholder="Enter supplier name"
                />
              </div>

              {/* Input Mode Toggle */}
              <div style={{ 'margin-bottom': '1rem' }}>
                <label style={labelStyle}>Input Method</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    style={{
                      flex: 1,
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      background: inputMode() === 'file' ? 'var(--primary-color)' : 'white',
                      color: inputMode() === 'file' ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      'font-size': '0.875rem'
                    }}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    style={{
                      flex: 1,
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      background: inputMode() === 'text' ? 'var(--primary-color)' : 'white',
                      color: inputMode() === 'text' ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      'font-size': '0.875rem'
                    }}
                  >
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('ai')}
                    style={{
                      flex: 1,
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      background: inputMode() === 'ai' ? 'var(--warning-color)' : 'white',
                      color: inputMode() === 'ai' ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      'font-size': '0.875rem'
                    }}
                  >
                    AI Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('json')}
                    style={{
                      flex: 1,
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      background: inputMode() === 'json' ? 'var(--info-color)' : 'white',
                      color: inputMode() === 'json' ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      'font-size': '0.875rem'
                    }}
                  >
                    JSON List
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('pdf-map')}
                    style={{
                      flex: 1,
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--border-color)',
                      'border-radius': 'var(--border-radius-sm)',
                      background: inputMode() === 'pdf-map' ? 'var(--success-color)' : 'white',
                      color: inputMode() === 'pdf-map' ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      'font-size': '0.875rem'
                    }}
                  >
                    PDF Fields
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <Show when={inputMode() === 'file'}>
                <div style={{ 'margin-bottom': '1rem' }}>
                  <label style={labelStyle}>Upload File (CSV or PDF) *</label>
                  <input
                    type="file"
                    accept=".csv,.pdf"
                    onChange={handleFileSelect}
                    style={inputStyle}
                  />
                  <Show when={selectedFile()}>
                    <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                      Selected: {selectedFile()?.name} ({fileType().toUpperCase()})
                    </div>
                  </Show>
                </div>
              </Show>

              {/* Manual Text Input */}
              <Show when={inputMode() === 'text'}>
                <div style={{ 'margin-bottom': '1rem' }}>
                  <label style={labelStyle}>Paste Product List *</label>
                  <textarea
                    value={manualText()}
                    onInput={(e) => setManualText(e.currentTarget.value)}
                    style={{
                      ...inputStyle,
                      'min-height': '150px',
                      'font-family': 'monospace',
                      'font-size': '0.8rem',
                      resize: 'vertical'
                    }}
                    placeholder={`Paste product data here. Expected formats:

Product Name    $12.99
Product Name    10    $25.00
Product Name    10    kg    $2.50    $25.00

Tip: Copy text from PDF and paste here`}
                  />
                  <div style={{ 'margin-top': '0.5rem', 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                    One product per line. Use spaces or tabs to separate columns.
                  </div>
                </div>
              </Show>

              {/* AI Analysis Mode */}
              <Show when={inputMode() === 'ai'}>
                <div style={{
                  padding: '1rem',
                  background: 'var(--warning-light)',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '1rem'
                }}>
                  <h4 style={{ 'margin-bottom': '0.75rem', color: 'var(--warning-color)' }}>
                    AI-Powered Analysis
                  </h4>
                  <p style={{ 'font-size': '0.875rem', 'margin-bottom': '1rem' }}>
                    Use AI to analyze complex PDFs or CSVs that don't parse correctly.
                    The file is sent directly to the AI backend for analysis.
                  </p>

                  {/* Upload file for AI */}
                  <div style={{ 'margin-bottom': '1rem' }}>
                    <label style={labelStyle}>Upload File (PDF or CSV)</label>
                    <input
                      type="file"
                      accept=".csv,.pdf"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (!file) return;

                        const ext = file.name.split('.').pop()?.toLowerCase();
                        setAiFileType(ext === 'pdf' ? 'pdf' : 'csv');
                        setAiFile(file);

                        // Auto-suggest supplier name
                        if (!supplierName()) {
                          const baseName = file.name.replace(/\.(csv|pdf)$/i, '');
                          setSupplierName(baseName.replace(/[_-]/g, ' ').trim());
                        }
                      }}
                      style={inputStyle}
                    />
                    <Show when={aiFile()}>
                      <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                        Selected: {aiFile()?.name} ({aiFileType().toUpperCase()})
                      </div>
                    </Show>
                  </div>

                  {/* Analysis Prompt */}
                  <div style={{ 'margin-bottom': '1rem' }}>
                    <label style={labelStyle}>Analysis Prompt</label>
                    <textarea
                      value={aiPrompt()}
                      onInput={(e) => setAiPrompt(e.currentTarget.value)}
                      style={{
                        ...inputStyle,
                        'min-height': '100px',
                        'font-family': 'monospace',
                        'font-size': '0.75rem',
                        resize: 'vertical'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', 'margin-top': '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setAiPrompt(getDefaultB2BPrompt())}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: '1px solid var(--border-color)',
                          'border-radius': 'var(--border-radius-sm)',
                          background: 'white',
                          cursor: 'pointer',
                          'font-size': '0.75rem'
                        }}
                      >
                        Reset to Default
                      </button>
                    </div>
                  </div>

                  {/* Analyze Button */}
                  <Button
                    variant="primary"
                    disabled={!aiFile() || !supplierName() || aiAnalyzing()}
                    onClick={async () => {
                      const file = aiFile();
                      if (!file) return;

                      setAiAnalyzing(true);
                      setError(null);

                      try {
                        console.log(`🤖 Starting AI analysis for ${file.name}...`);

                        // Convert file to base64
                        const base64 = await fileToBase64(file);
                        console.log(`📦 File converted to base64 (${base64.length} chars)`);

                        // Call the appropriate AI analyzer
                        let result;
                        if (aiFileType() === 'pdf') {
                          console.log('📄 Calling analyzePdfWithAI...');
                          result = await analyzePdfWithAI(base64, aiPrompt(), supplierName());
                        } else {
                          console.log('📊 Calling analyzeCsvWithAI...');
                          result = await analyzeCsvWithAI(base64, aiPrompt(), supplierName(), true);
                        }

                        console.log('🤖 AI Result:', result);

                        if (result.success && result.products.length > 0) {
                          const offer = createOfferFromAIProducts(
                            result.products,
                            supplierName() || 'AI Analyzed',
                            file.name,
                            aiFileType()
                          );
                          offersStore.addSupplierOffer(offer);
                          setSuccessMessage(`Added ${result.products.length} products from AI analysis`);
                          setTimeout(() => setSuccessMessage(null), 3000);

                          // Reset
                          setAiFile(null);
                          setSupplierName('');

                          if (offersStore.offers().length >= 2) {
                            setViewMode('compare');
                          }
                        } else {
                          setError(result.error || 'AI analysis returned no products');
                        }
                      } catch (err) {
                        console.error('❌ AI Analysis error:', err);
                        setError(err instanceof Error ? err.message : 'Failed to analyze with AI');
                      } finally {
                        setAiAnalyzing(false);
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    {aiAnalyzing() ? 'Analyzing with AI...' : 'Analyze with AI'}
                  </Button>
                </div>
              </Show>

              {/* JSON List Mode */}
              <Show when={inputMode() === 'json'}>
                <div style={{
                  padding: '1rem',
                  background: 'var(--info-light)',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '1rem'
                }}>
                  <h4 style={{ 'margin-bottom': '0.75rem', color: 'var(--info-color)' }}>
                    JSON Product List
                  </h4>
                  <p style={{ 'font-size': '0.875rem', 'margin-bottom': '1rem' }}>
                    Paste a JSON array of products and map the fields to the comparison columns.
                  </p>

                  {/* JSON Input */}
                  <div style={{ 'margin-bottom': '1rem' }}>
                    <label style={labelStyle}>Paste JSON Array</label>
                    <textarea
                      value={jsonText()}
                      onInput={(e) => {
                        const text = e.currentTarget.value;
                        setJsonText(text);
                        setError(null);

                        // Try to parse and detect fields
                        try {
                          if (!text.trim()) {
                            setJsonData([]);
                            setJsonFields([]);
                            setJsonPreview([]);
                            return;
                          }

                          let parsed = JSON.parse(text);

                          // Handle wrapped data (e.g., { products: [...] } or { data: [...] })
                          if (!Array.isArray(parsed)) {
                            if (parsed.products && Array.isArray(parsed.products)) {
                              parsed = parsed.products;
                            } else if (parsed.data && Array.isArray(parsed.data)) {
                              parsed = parsed.data;
                            } else if (parsed.items && Array.isArray(parsed.items)) {
                              parsed = parsed.items;
                            } else {
                              throw new Error('JSON must be an array or contain a products/data/items array');
                            }
                          }

                          setJsonData(parsed);
                          setJsonPreview(parsed.slice(0, 3));

                          // Detect all unique fields from first few items
                          const fields = new Set<string>();
                          parsed.slice(0, 10).forEach((item: any) => {
                            if (item && typeof item === 'object') {
                              Object.keys(item).forEach(key => fields.add(key));
                            }
                          });
                          const fieldList = Array.from(fields).sort();
                          setJsonFields(fieldList);

                          // Auto-suggest field mappings
                          const mapping: JsonFieldMapping = {
                            productName: '',
                            productCode: '',
                            quantity: '',
                            unit: '',
                            unitPrice: '',
                            totalPrice: '',
                            category: '',
                          };

                          fieldList.forEach(field => {
                            const lower = field.toLowerCase();
                            if (!mapping.productName && (lower.includes('name') || lower.includes('description') || lower.includes('product'))) {
                              mapping.productName = field;
                            }
                            if (!mapping.productCode && (lower.includes('code') || lower.includes('sku') || lower.includes('upc') || lower.includes('barcode') || lower === 'id')) {
                              mapping.productCode = field;
                            }
                            if (!mapping.quantity && (lower.includes('qty') || lower.includes('quantity') || lower.includes('amount'))) {
                              mapping.quantity = field;
                            }
                            if (!mapping.unit && (lower.includes('unit') || lower === 'uom')) {
                              mapping.unit = field;
                            }
                            if (!mapping.unitPrice && (lower.includes('price') || lower.includes('cost')) && !lower.includes('total')) {
                              mapping.unitPrice = field;
                            }
                            if (!mapping.totalPrice && (lower.includes('total') || lower.includes('subtotal'))) {
                              mapping.totalPrice = field;
                            }
                            if (!mapping.category && (lower.includes('category') || lower.includes('type') || lower.includes('group'))) {
                              mapping.category = field;
                            }
                          });

                          setJsonFieldMapping(mapping);
                        } catch (err) {
                          if (text.trim()) {
                            setError(err instanceof Error ? err.message : 'Invalid JSON');
                          }
                          setJsonData([]);
                          setJsonFields([]);
                        }
                      }}
                      style={{
                        ...inputStyle,
                        'min-height': '120px',
                        'font-family': 'monospace',
                        'font-size': '0.75rem',
                        resize: 'vertical'
                      }}
                      placeholder='Paste JSON array here, e.g.:
[
  {"name": "Product A", "sku": "123", "price": 10.99, "qty": 5},
  {"name": "Product B", "sku": "456", "price": 15.99, "qty": 3}
]'
                    />
                  </div>

                  {/* Field Mapping */}
                  <Show when={jsonFields().length > 0}>
                    <div style={{
                      padding: '1rem',
                      background: 'white',
                      'border-radius': 'var(--border-radius-sm)',
                      'margin-bottom': '1rem'
                    }}>
                      <h5 style={{ 'margin-bottom': '0.75rem', 'font-weight': '600' }}>
                        Map JSON Fields ({jsonData().length} items detected)
                      </h5>
                      <p style={{ 'font-size': '0.75rem', color: 'var(--text-muted)', 'margin-bottom': '1rem' }}>
                        Match your JSON fields to the product comparison columns.
                      </p>

                      <div style={{
                        display: 'grid',
                        'grid-template-columns': 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '0.75rem'
                      }}>
                        {/* Product Name - Required */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem', color: 'var(--danger-color)' }}>
                            Product Name *
                          </label>
                          <select
                            value={jsonFieldMapping().productName}
                            onChange={(e) => setJsonFieldMapping(prev => ({ ...prev, productName: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Select Field --</option>
                            <For each={jsonFields()}>
                              {(field) => <option value={field}>{field}</option>}
                            </For>
                          </select>
                        </div>

                        {/* Unit Price - Required */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem', color: 'var(--danger-color)' }}>
                            Unit Price *
                          </label>
                          <select
                            value={jsonFieldMapping().unitPrice}
                            onChange={(e) => setJsonFieldMapping(prev => ({ ...prev, unitPrice: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Select Field --</option>
                            <For each={jsonFields()}>
                              {(field) => <option value={field}>{field}</option>}
                            </For>
                          </select>
                        </div>

                        {/* Product Code */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem' }}>Product Code</label>
                          <select
                            value={jsonFieldMapping().productCode}
                            onChange={(e) => setJsonFieldMapping(prev => ({ ...prev, productCode: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Not Mapped --</option>
                            <For each={jsonFields()}>
                              {(field) => <option value={field}>{field}</option>}
                            </For>
                          </select>
                        </div>

                        {/* Quantity */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem' }}>Quantity</label>
                          <select
                            value={jsonFieldMapping().quantity}
                            onChange={(e) => setJsonFieldMapping(prev => ({ ...prev, quantity: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Not Mapped --</option>
                            <For each={jsonFields()}>
                              {(field) => <option value={field}>{field}</option>}
                            </For>
                          </select>
                        </div>

                        {/* Unit */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem' }}>Unit</label>
                          <select
                            value={jsonFieldMapping().unit}
                            onChange={(e) => setJsonFieldMapping(prev => ({ ...prev, unit: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Not Mapped --</option>
                            <For each={jsonFields()}>
                              {(field) => <option value={field}>{field}</option>}
                            </For>
                          </select>
                        </div>

                        {/* Total Price */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem' }}>Total Price</label>
                          <select
                            value={jsonFieldMapping().totalPrice}
                            onChange={(e) => setJsonFieldMapping(prev => ({ ...prev, totalPrice: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Not Mapped --</option>
                            <For each={jsonFields()}>
                              {(field) => <option value={field}>{field}</option>}
                            </For>
                          </select>
                        </div>

                        {/* Category */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem' }}>Category</label>
                          <select
                            value={jsonFieldMapping().category}
                            onChange={(e) => setJsonFieldMapping(prev => ({ ...prev, category: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Not Mapped --</option>
                            <For each={jsonFields()}>
                              {(field) => <option value={field}>{field}</option>}
                            </For>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <Show when={jsonPreview().length > 0 && jsonFieldMapping().productName}>
                      <div style={{
                        padding: '0.75rem',
                        background: 'white',
                        'border-radius': 'var(--border-radius-sm)',
                        'margin-bottom': '1rem',
                        'max-height': '150px',
                        overflow: 'auto'
                      }}>
                        <h5 style={{ 'margin-bottom': '0.5rem', 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                          Preview (first 3 items):
                        </h5>
                        <table style={{ width: '100%', 'font-size': '0.75rem', 'border-collapse': 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'var(--gray-50)' }}>
                              <th style={{ padding: '0.25rem 0.5rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>Name</th>
                              <th style={{ padding: '0.25rem 0.5rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>Code</th>
                              <th style={{ padding: '0.25rem 0.5rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)' }}>Price</th>
                              <th style={{ padding: '0.25rem 0.5rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)' }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            <For each={jsonPreview()}>
                              {(item) => (
                                <tr>
                                  <td style={{ padding: '0.25rem 0.5rem', 'border-bottom': '1px solid var(--border-color)' }}>
                                    {jsonFieldMapping().productName ? String(item[jsonFieldMapping().productName] || '') : '--'}
                                  </td>
                                  <td style={{ padding: '0.25rem 0.5rem', 'border-bottom': '1px solid var(--border-color)' }}>
                                    {jsonFieldMapping().productCode ? String(item[jsonFieldMapping().productCode] || '') : '--'}
                                  </td>
                                  <td style={{ padding: '0.25rem 0.5rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)' }}>
                                    {jsonFieldMapping().unitPrice ? `$${parseFloat(item[jsonFieldMapping().unitPrice] || 0).toFixed(2)}` : '--'}
                                  </td>
                                  <td style={{ padding: '0.25rem 0.5rem', 'text-align': 'right', 'border-bottom': '1px solid var(--border-color)' }}>
                                    {jsonFieldMapping().quantity ? String(item[jsonFieldMapping().quantity] || 1) : '1'}
                                  </td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </table>
                      </div>
                    </Show>

                    {/* Add Button */}
                    <Button
                      variant="primary"
                      disabled={!supplierName() || !jsonFieldMapping().productName || !jsonFieldMapping().unitPrice || jsonData().length === 0}
                      onClick={() => {
                        const mapping = jsonFieldMapping();
                        const data = jsonData();

                        if (!mapping.productName || !mapping.unitPrice) {
                          setError('Product Name and Unit Price fields are required');
                          return;
                        }

                        try {
                          const products: ProductOffer[] = data
                            .filter(item => item && item[mapping.productName])
                            .map(item => {
                              const name = String(item[mapping.productName] || '').trim();
                              const unitPrice = parseFloat(item[mapping.unitPrice]) || 0;
                              const quantity = mapping.quantity ? (parseFloat(item[mapping.quantity]) || 1) : 1;
                              const totalPrice = mapping.totalPrice
                                ? (parseFloat(item[mapping.totalPrice]) || unitPrice * quantity)
                                : unitPrice * quantity;

                              return {
                                id: `json-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                productCode: mapping.productCode ? String(item[mapping.productCode] || '') : undefined,
                                productName: name,
                                quantity,
                                unit: mapping.unit ? String(item[mapping.unit] || 'unit') : 'unit',
                                unitPrice,
                                totalPrice,
                                currency: 'USD',
                                category: mapping.category ? String(item[mapping.category] || '') : undefined,
                                normalizedName: normalizeProductName(name),
                              };
                            });

                          if (products.length === 0) {
                            setError('No valid products found in JSON');
                            return;
                          }

                          const totalValue = products.reduce((sum, p) => sum + p.totalPrice, 0);

                          const offer: SupplierOffer = {
                            id: `offer-${Date.now()}`,
                            supplierName: supplierName(),
                            sourceFile: 'json-import',
                            sourceType: 'csv',
                            uploadDate: Date.now(),
                            products,
                            currency: 'USD',
                            totalProducts: products.length,
                            totalValue,
                          };

                          offersStore.addSupplierOffer(offer);
                          setSuccessMessage(`Added ${products.length} products from JSON`);
                          setTimeout(() => setSuccessMessage(null), 3000);

                          // Reset
                          setJsonText('');
                          setJsonData([]);
                          setJsonFields([]);
                          setJsonPreview([]);
                          setSupplierName('');

                          if (offersStore.offers().length >= 2) {
                            setViewMode('compare');
                          }
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to parse JSON');
                        }
                      }}
                      style={{ width: '100%' }}
                    >
                      Add {jsonData().length} Products from JSON
                    </Button>
                  </Show>
                </div>
              </Show>

              {/* PDF Field Mapping Mode */}
              <Show when={inputMode() === 'pdf-map'}>
                <div style={{
                  padding: '1rem',
                  background: 'var(--success-light)',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '1rem'
                }}>
                  <h4 style={{ 'margin-bottom': '0.75rem', color: 'var(--success-color)' }}>
                    PDF Field Mapping
                  </h4>
                  <p style={{ 'font-size': '0.875rem', 'margin-bottom': '1rem' }}>
                    Upload a PDF, extract its table data, and map columns to product fields.
                  </p>

                  {/* PDF Upload */}
                  <div style={{ 'margin-bottom': '1rem' }}>
                    <label style={labelStyle}>Upload PDF File</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={async (e) => {
                        const file = e.currentTarget.files?.[0];
                        if (!file) return;

                        setPdfFile(file);
                        setPdfParsing(true);
                        setError(null);

                        try {
                          // Extract text from PDF
                          const text = await extractTextFromPDF(file);
                          console.log('📄 Extracted PDF text:', text.substring(0, 500));

                          // Parse text into rows (split by newlines, then by tabs/multiple spaces)
                          const lines = text.split('\n').filter(line => line.trim());
                          const rows: string[][] = [];

                          for (const line of lines) {
                            // Split by tabs or multiple spaces (2+)
                            const cells = line.split(/\t|  +/).map(cell => cell.trim()).filter(cell => cell);
                            if (cells.length >= 2) {
                              rows.push(cells);
                            }
                          }

                          if (rows.length === 0) {
                            throw new Error('No table data found in PDF. Try AI Analysis mode instead.');
                          }

                          // Detect max columns
                          const maxCols = Math.max(...rows.map(r => r.length));

                          // Normalize rows to have same column count
                          const normalizedRows = rows.map(row => {
                            while (row.length < maxCols) row.push('');
                            return row.slice(0, maxCols);
                          });

                          setPdfRows(normalizedRows);
                          setPdfPreview(normalizedRows.slice(0, 5));

                          // Generate column headers (Col 1, Col 2, etc. or first row if has header)
                          const headers = normalizedRows[0].map((cell, i) =>
                            cell && cell.length < 30 ? cell : `Column ${i + 1}`
                          );
                          setPdfHeaders(headers);

                          // Auto-suggest field mappings based on header names
                          const mapping: JsonFieldMapping = {
                            productName: '',
                            productCode: '',
                            quantity: '',
                            unit: '',
                            unitPrice: '',
                            totalPrice: '',
                            category: '',
                          };

                          headers.forEach((header, idx) => {
                            const lower = header.toLowerCase();
                            const colKey = `${idx}`;
                            if (!mapping.productName && (lower.includes('name') || lower.includes('description') || lower.includes('product'))) {
                              mapping.productName = colKey;
                            }
                            if (!mapping.productCode && (lower.includes('upc') || lower.includes('code') || lower.includes('sku') || lower.includes('barcode'))) {
                              mapping.productCode = colKey;
                            }
                            if (!mapping.quantity && (lower.includes('qty') || lower.includes('quantity') || lower.includes('case'))) {
                              mapping.quantity = colKey;
                            }
                            if (!mapping.unitPrice && (lower.includes('price') || lower.includes('cost')) && !lower.includes('total')) {
                              mapping.unitPrice = colKey;
                            }
                            if (!mapping.totalPrice && (lower.includes('total') || lower.includes('amount'))) {
                              mapping.totalPrice = colKey;
                            }
                          });

                          setPdfFieldMapping(mapping);

                          // Auto-suggest supplier name
                          if (!supplierName()) {
                            const baseName = file.name.replace(/\.pdf$/i, '');
                            setSupplierName(baseName.replace(/[_-]/g, ' ').trim());
                          }

                          setSuccessMessage(`Extracted ${normalizedRows.length} rows with ${maxCols} columns from PDF`);
                          setTimeout(() => setSuccessMessage(null), 3000);
                        } catch (err) {
                          console.error('PDF parsing error:', err);
                          setError(err instanceof Error ? err.message : 'Failed to parse PDF');
                        } finally {
                          setPdfParsing(false);
                        }
                      }}
                      style={inputStyle}
                      disabled={pdfParsing()}
                    />
                    <Show when={pdfFile()}>
                      <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                        Selected: {pdfFile()?.name}
                      </div>
                    </Show>
                    <Show when={pdfParsing()}>
                      <div style={{ 'margin-top': '0.5rem', 'font-size': '0.875rem', color: 'var(--warning-color)' }}>
                        Extracting text from PDF...
                      </div>
                    </Show>
                  </div>

                  {/* Field Mapping */}
                  <Show when={pdfHeaders().length > 0}>
                    <div style={{
                      padding: '1rem',
                      background: 'white',
                      'border-radius': 'var(--border-radius-sm)',
                      'margin-bottom': '1rem'
                    }}>
                      <h5 style={{ 'margin-bottom': '0.75rem', 'font-weight': '600' }}>
                        Map PDF Columns ({pdfRows().length} rows detected)
                      </h5>

                      {/* Has Header Toggle */}
                      <div style={{ 'margin-bottom': '1rem' }}>
                        <label style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={pdfHasHeader()}
                            onChange={(e) => setPdfHasHeader(e.currentTarget.checked)}
                          />
                          <span style={{ 'font-size': '0.875rem' }}>First row contains headers</span>
                        </label>
                      </div>

                      <div style={{
                        display: 'grid',
                        'grid-template-columns': 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '0.75rem'
                      }}>
                        {/* Product Name - Required */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem', color: 'var(--danger-color)' }}>
                            Product Name *
                          </label>
                          <select
                            value={pdfFieldMapping().productName}
                            onChange={(e) => setPdfFieldMapping(prev => ({ ...prev, productName: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Select Column --</option>
                            <For each={pdfHeaders()}>
                              {(header, idx) => <option value={idx()}>{idx()}: {header}</option>}
                            </For>
                          </select>
                        </div>

                        {/* Unit Price - Required */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem', color: 'var(--danger-color)' }}>
                            Unit Price *
                          </label>
                          <select
                            value={pdfFieldMapping().unitPrice}
                            onChange={(e) => setPdfFieldMapping(prev => ({ ...prev, unitPrice: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Select Column --</option>
                            <For each={pdfHeaders()}>
                              {(header, idx) => <option value={idx()}>{idx()}: {header}</option>}
                            </For>
                          </select>
                        </div>

                        {/* Product Code */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem' }}>UPC/Code</label>
                          <select
                            value={pdfFieldMapping().productCode}
                            onChange={(e) => setPdfFieldMapping(prev => ({ ...prev, productCode: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Not Mapped --</option>
                            <For each={pdfHeaders()}>
                              {(header, idx) => <option value={idx()}>{idx()}: {header}</option>}
                            </For>
                          </select>
                        </div>

                        {/* Quantity */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem' }}>Quantity</label>
                          <select
                            value={pdfFieldMapping().quantity}
                            onChange={(e) => setPdfFieldMapping(prev => ({ ...prev, quantity: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Not Mapped --</option>
                            <For each={pdfHeaders()}>
                              {(header, idx) => <option value={idx()}>{idx()}: {header}</option>}
                            </For>
                          </select>
                        </div>

                        {/* Total Price */}
                        <div>
                          <label style={{ ...labelStyle, 'font-size': '0.8rem' }}>Total Price</label>
                          <select
                            value={pdfFieldMapping().totalPrice}
                            onChange={(e) => setPdfFieldMapping(prev => ({ ...prev, totalPrice: e.currentTarget.value }))}
                            style={{ ...inputStyle, 'font-size': '0.85rem' }}
                          >
                            <option value="">-- Not Mapped --</option>
                            <For each={pdfHeaders()}>
                              {(header, idx) => <option value={idx()}>{idx()}: {header}</option>}
                            </For>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Preview Table */}
                    <Show when={pdfPreview().length > 0}>
                      <div style={{
                        padding: '0.75rem',
                        background: 'white',
                        'border-radius': 'var(--border-radius-sm)',
                        'margin-bottom': '1rem',
                        'max-height': '200px',
                        overflow: 'auto'
                      }}>
                        <h5 style={{ 'margin-bottom': '0.5rem', 'font-size': '0.8rem', color: 'var(--text-muted)' }}>
                          Preview (first 5 rows):
                        </h5>
                        <table style={{ width: '100%', 'font-size': '0.7rem', 'border-collapse': 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'var(--gray-50)' }}>
                              <For each={pdfHeaders()}>
                                {(header, idx) => (
                                  <th style={{
                                    padding: '0.25rem 0.4rem',
                                    'text-align': 'left',
                                    'border-bottom': '1px solid var(--border-color)',
                                    'font-weight': '600',
                                    'white-space': 'nowrap',
                                    background: pdfFieldMapping().productName === `${idx()}` ? 'var(--success-light)' :
                                               pdfFieldMapping().unitPrice === `${idx()}` ? 'var(--warning-light)' :
                                               pdfFieldMapping().productCode === `${idx()}` ? 'var(--info-light)' : 'inherit'
                                  }}>
                                    {header}
                                  </th>
                                )}
                              </For>
                            </tr>
                          </thead>
                          <tbody>
                            <For each={pdfHasHeader() ? pdfPreview().slice(1) : pdfPreview()}>
                              {(row) => (
                                <tr>
                                  <For each={row}>
                                    {(cell, idx) => (
                                      <td style={{
                                        padding: '0.25rem 0.4rem',
                                        'border-bottom': '1px solid var(--border-color)',
                                        'max-width': '150px',
                                        overflow: 'hidden',
                                        'text-overflow': 'ellipsis',
                                        'white-space': 'nowrap',
                                        background: pdfFieldMapping().productName === `${idx()}` ? 'var(--success-light)' :
                                                   pdfFieldMapping().unitPrice === `${idx()}` ? 'var(--warning-light)' :
                                                   pdfFieldMapping().productCode === `${idx()}` ? 'var(--info-light)' : 'inherit'
                                      }}>
                                        {cell}
                                      </td>
                                    )}
                                  </For>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </table>
                        <div style={{ 'margin-top': '0.5rem', 'font-size': '0.7rem', color: 'var(--text-muted)' }}>
                          <span style={{ background: 'var(--success-light)', padding: '0.1rem 0.3rem', 'margin-right': '0.5rem' }}>Product Name</span>
                          <span style={{ background: 'var(--warning-light)', padding: '0.1rem 0.3rem', 'margin-right': '0.5rem' }}>Price</span>
                          <span style={{ background: 'var(--info-light)', padding: '0.1rem 0.3rem' }}>Code</span>
                        </div>
                      </div>
                    </Show>

                    {/* Add Button */}
                    <Button
                      variant="primary"
                      disabled={!supplierName() || !pdfFieldMapping().productName || !pdfFieldMapping().unitPrice || pdfRows().length === 0}
                      onClick={() => {
                        const mapping = pdfFieldMapping();
                        const rows = pdfHasHeader() ? pdfRows().slice(1) : pdfRows();

                        if (!mapping.productName || !mapping.unitPrice) {
                          setError('Product Name and Unit Price columns are required');
                          return;
                        }

                        try {
                          const nameIdx = parseInt(mapping.productName);
                          const priceIdx = parseInt(mapping.unitPrice);
                          const codeIdx = mapping.productCode ? parseInt(mapping.productCode) : -1;
                          const qtyIdx = mapping.quantity ? parseInt(mapping.quantity) : -1;
                          const totalIdx = mapping.totalPrice ? parseInt(mapping.totalPrice) : -1;

                          const products: ProductOffer[] = rows
                            .filter(row => row[nameIdx] && row[nameIdx].trim())
                            .map(row => {
                              const name = row[nameIdx]?.trim() || '';
                              // Parse price - remove currency symbols and commas
                              const priceStr = (row[priceIdx] || '0').replace(/[$,€£]/g, '').trim();
                              const unitPrice = parseFloat(priceStr) || 0;
                              const quantity = qtyIdx >= 0 ? (parseFloat(row[qtyIdx]?.replace(/[^0-9.]/g, '') || '1') || 1) : 1;
                              const totalPrice = totalIdx >= 0
                                ? (parseFloat(row[totalIdx]?.replace(/[$,€£]/g, '') || '0') || unitPrice * quantity)
                                : unitPrice * quantity;

                              return {
                                id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                productCode: codeIdx >= 0 ? row[codeIdx]?.trim() : undefined,
                                productName: name,
                                quantity,
                                unit: 'unit',
                                unitPrice,
                                totalPrice,
                                currency: 'USD',
                                normalizedName: normalizeProductName(name),
                              };
                            })
                            .filter(p => p.unitPrice > 0 || p.productName);

                          if (products.length === 0) {
                            setError('No valid products found. Check your column mappings.');
                            return;
                          }

                          const totalValue = products.reduce((sum, p) => sum + p.totalPrice, 0);

                          const offer: SupplierOffer = {
                            id: `offer-${Date.now()}`,
                            supplierName: supplierName(),
                            sourceFile: pdfFile()?.name || 'pdf-import',
                            sourceType: 'pdf',
                            uploadDate: Date.now(),
                            products,
                            currency: 'USD',
                            totalProducts: products.length,
                            totalValue,
                          };

                          offersStore.addSupplierOffer(offer);
                          setSuccessMessage(`Added ${products.length} products from PDF`);
                          setTimeout(() => setSuccessMessage(null), 3000);

                          // Reset
                          setPdfFile(null);
                          setPdfRows([]);
                          setPdfHeaders([]);
                          setPdfPreview([]);
                          setSupplierName('');

                          if (offersStore.offers().length >= 2) {
                            setViewMode('compare');
                          }
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to parse PDF data');
                        }
                      }}
                      style={{ width: '100%' }}
                    >
                      Add {pdfHasHeader() ? pdfRows().length - 1 : pdfRows().length} Products from PDF
                    </Button>
                  </Show>
                </div>
              </Show>

              {/* CSV Configuration */}
              <Show when={inputMode() === 'file' && fileType() === 'csv' && detectedHeaders().length > 0}>
                <div style={{
                  padding: '1rem',
                  background: 'var(--gray-50)',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center',
                    'margin-bottom': '0.75rem'
                  }}>
                    <span style={{ 'font-weight': '500' }}>CSV Configuration</span>
                    <button
                      onClick={() => setShowAdvancedConfig(!showAdvancedConfig())}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-color)',
                        cursor: 'pointer',
                        'font-size': '0.875rem'
                      }}
                    >
                      {showAdvancedConfig() ? 'Hide' : 'Show'} Column Mapping
                    </button>
                  </div>

                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-bottom': '0.5rem' }}>
                    Detected {detectedHeaders().length} columns: {detectedHeaders().slice(0, 5).join(', ')}
                    {detectedHeaders().length > 5 && '...'}
                  </div>

                  <Show when={showAdvancedConfig()}>
                    <div style={{
                      display: 'grid',
                      'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem',
                      'margin-top': '1rem'
                    }}>
                      <div>
                        <label style={{ ...labelStyle, 'font-size': '0.875rem' }}>Product Name Column</label>
                        <select
                          value={csvConfig().columnMapping.productName}
                          onChange={(e) => setCsvConfig(prev => ({
                            ...prev,
                            columnMapping: { ...prev.columnMapping, productName: parseInt(e.currentTarget.value) }
                          }))}
                          style={inputStyle}
                        >
                          <For each={detectedHeaders()}>
                            {(header, idx) => (
                              <option value={idx()}>{idx()}: {header}</option>
                            )}
                          </For>
                        </select>
                      </div>

                      <div>
                        <label style={{ ...labelStyle, 'font-size': '0.875rem' }}>Unit Price Column</label>
                        <select
                          value={csvConfig().columnMapping.unitPrice}
                          onChange={(e) => setCsvConfig(prev => ({
                            ...prev,
                            columnMapping: { ...prev.columnMapping, unitPrice: parseInt(e.currentTarget.value) }
                          }))}
                          style={inputStyle}
                        >
                          <For each={detectedHeaders()}>
                            {(header, idx) => (
                              <option value={idx()}>{idx()}: {header}</option>
                            )}
                          </For>
                        </select>
                      </div>

                      <div>
                        <label style={{ ...labelStyle, 'font-size': '0.875rem' }}>Quantity Column (optional)</label>
                        <select
                          value={csvConfig().columnMapping.quantity ?? -1}
                          onChange={(e) => {
                            const val = parseInt(e.currentTarget.value);
                            setCsvConfig(prev => ({
                              ...prev,
                              columnMapping: {
                                ...prev.columnMapping,
                                quantity: val >= 0 ? val : undefined
                              }
                            }));
                          }}
                          style={inputStyle}
                        >
                          <option value={-1}>-- Not mapped --</option>
                          <For each={detectedHeaders()}>
                            {(header, idx) => (
                              <option value={idx()}>{idx()}: {header}</option>
                            )}
                          </For>
                        </select>
                      </div>

                      <div>
                        <label style={{ ...labelStyle, 'font-size': '0.875rem' }}>Product Code Column (optional)</label>
                        <select
                          value={csvConfig().columnMapping.productCode ?? -1}
                          onChange={(e) => {
                            const val = parseInt(e.currentTarget.value);
                            setCsvConfig(prev => ({
                              ...prev,
                              columnMapping: {
                                ...prev.columnMapping,
                                productCode: val >= 0 ? val : undefined
                              }
                            }));
                          }}
                          style={inputStyle}
                        >
                          <option value={-1}>-- Not mapped --</option>
                          <For each={detectedHeaders()}>
                            {(header, idx) => (
                              <option value={idx()}>{idx()}: {header}</option>
                            )}
                          </For>
                        </select>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>

              <Show when={inputMode() !== 'ai' && inputMode() !== 'json' && inputMode() !== 'pdf-map'}>
                <Button
                  variant="primary"
                  onClick={handleAddOffer}
                  disabled={loading() || !supplierName() || (inputMode() === 'file' ? !selectedFile() : !manualText().trim())}
                  style={{ width: '100%' }}
                >
                  {loading() ? 'Processing...' : 'Add Offer'}
                </Button>
              </Show>
            </div>
          </Card>

          {/* Current Offers List */}
          <Card>
            <div style={cardStyle}>
              <h3 style={{ 'margin-bottom': '1.5rem', 'font-weight': '600' }}>
                Loaded Offers ({supplierOffers().length})
              </h3>

              <Show when={supplierOffers().length === 0}>
                <div style={{
                  padding: '2rem',
                  'text-align': 'center',
                  color: 'var(--text-muted)',
                  background: 'var(--gray-50)',
                  'border-radius': 'var(--border-radius-sm)'
                }}>
                  No offers loaded yet. Upload CSV or PDF files to start comparing.
                </div>
              </Show>

              <For each={supplierOffers()}>
                {(offer) => (
                  <div style={{
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)',
                    'margin-bottom': '0.75rem',
                    overflow: 'hidden'
                  }}>
                    {/* Header */}
                    <div style={{
                      padding: '1rem',
                      background: 'var(--gray-50)',
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center'
                    }}>
                      <div>
                        <div style={{ 'font-weight': '600' }}>{offer.supplierName}</div>
                        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                          {offer.totalProducts} products | {formatCurrency(offer.totalValue, offer.currency)} total
                        </div>
                        <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                          Source: {offer.sourceFile} ({offer.sourceType.toUpperCase()})
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveOffer(offer.id)}
                        style={{
                          background: 'var(--danger-color)',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          'border-radius': 'var(--border-radius-sm)',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    {/* Product List */}
                    <div style={{
                      'max-height': '200px',
                      overflow: 'auto',
                      'font-size': '0.8rem'
                    }}>
                      <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--gray-100)', position: 'sticky', top: 0 }}>
                            <th style={{ padding: '0.4rem 0.6rem', 'text-align': 'left', 'font-weight': '600' }}>Product</th>
                            <th style={{ padding: '0.4rem 0.6rem', 'text-align': 'left', 'font-weight': '600' }}>Code</th>
                            <th style={{ padding: '0.4rem 0.6rem', 'text-align': 'right', 'font-weight': '600' }}>Qty</th>
                            <th style={{ padding: '0.4rem 0.6rem', 'text-align': 'right', 'font-weight': '600' }}>Price</th>
                            <th style={{ padding: '0.4rem 0.6rem', 'text-align': 'right', 'font-weight': '600' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={offer.products}>
                            {(product, idx) => (
                              <tr style={{
                                background: idx() % 2 === 0 ? 'white' : 'var(--gray-50)',
                                'border-bottom': '1px solid var(--border-color)'
                              }}>
                                <td style={{ padding: '0.4rem 0.6rem', 'max-width': '200px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
                                  {product.productName}
                                </td>
                                <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', 'font-family': 'monospace', 'font-size': '0.75rem' }}>
                                  {product.productCode || '-'}
                                </td>
                                <td style={{ padding: '0.4rem 0.6rem', 'text-align': 'right' }}>
                                  {product.quantity} {product.unit}
                                </td>
                                <td style={{ padding: '0.4rem 0.6rem', 'text-align': 'right', 'font-weight': '500' }}>
                                  {formatCurrency(product.unitPrice)}
                                </td>
                                <td style={{ padding: '0.4rem 0.6rem', 'text-align': 'right' }}>
                                  {formatCurrency(product.totalPrice)}
                                </td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </For>

              <Show when={supplierOffers().length >= 2}>
                <Button
                  variant="primary"
                  onClick={() => setViewMode('compare')}
                  style={{ width: '100%', 'margin-top': '1rem' }}
                >
                  Compare Offers
                </Button>
              </Show>
            </div>
          </Card>
        </div>
      </Show>

      {/* Compare View */}
      <Show when={viewMode() === 'compare'}>
        {/* Summary Cards */}
        <Show when={comparisonResult()}>
          <div style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            'margin-bottom': '1.5rem'
          }}>
            <Card>
              <div style={{ padding: '1rem', 'text-align': 'center' }}>
                <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
                  {comparisonResult()!.summary.totalProducts}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>Total Products</div>
              </div>
            </Card>
            <Card>
              <div style={{ padding: '1rem', 'text-align': 'center' }}>
                <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--info-color)' }}>
                  {comparisonResult()!.summary.totalSuppliers}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>Suppliers</div>
              </div>
            </Card>
            <Card>
              <div style={{ padding: '1rem', 'text-align': 'center' }}>
                <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--warning-color)' }}>
                  {comparisonResult()!.summary.productsWithMultipleOffers}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>Products w/ Multiple Offers</div>
              </div>
            </Card>
            <Card>
              <div style={{ padding: '1rem', 'text-align': 'center' }}>
                <div style={{ 'font-size': '2rem', 'font-weight': '700', color: 'var(--success-color)' }}>
                  {formatCurrency(comparisonResult()!.summary.potentialSavings)}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>Potential Savings</div>
              </div>
            </Card>
          </div>
        </Show>

        {/* Filters */}
        <Card>
          <div style={{
            padding: '1rem',
            display: 'flex',
            gap: '1rem',
            'flex-wrap': 'wrap',
            'align-items': 'center'
          }}>
            <div style={{ flex: '1', 'min-width': '200px' }}>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm()}
                onInput={(e) => setSearchTerm(e.currentTarget.value)}
                style={inputStyle}
              />
            </div>
            <Show when={categories().length > 0}>
              <div>
                <select
                  value={filterCategory()}
                  onChange={(e) => setFilterCategory(e.currentTarget.value)}
                  style={inputStyle}
                >
                  <option value="">All Categories</option>
                  <For each={categories()}>
                    {(cat) => <option value={cat}>{cat}</option>}
                  </For>
                </select>
              </div>
            </Show>
            {/* Similarity Threshold Slider */}
            <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
              <label style={{ 'font-size': '0.8rem', 'white-space': 'nowrap' }}>
                Match Threshold:
              </label>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={offersStore.similarityThreshold()}
                onInput={(e) => offersStore.setSimilarityThreshold(parseInt(e.currentTarget.value))}
                style={{ width: '100px' }}
              />
              <span style={{
                'font-size': '0.8rem',
                'font-weight': '600',
                'min-width': '35px',
                color: offersStore.similarityThreshold() >= 90 ? 'var(--success-color)' :
                       offersStore.similarityThreshold() >= 70 ? 'var(--warning-color)' : 'var(--danger-color)'
              }}>
                {offersStore.similarityThreshold()}%
              </span>
            </div>
            <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
              Showing {filteredComparisons().length} of {comparisons().length} products
            </div>
          </div>
        </Card>

        {/* Comparison Table */}
        <Card>
          <div style={{ padding: '1rem', 'overflow-x': 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => handleSort('name')}>
                    Product {sortField() === 'name' && (sortDirection() === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={thStyle}>Match Score</th>
                  <th style={thStyle} onClick={() => handleSort('suppliers')}>
                    Suppliers {sortField() === 'suppliers' && (sortDirection() === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={thStyle} onClick={() => handleSort('bestPrice')}>
                    Best Price {sortField() === 'bestPrice' && (sortDirection() === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={thStyle}>Price Range</th>
                  <th style={thStyle} onClick={() => handleSort('savings')}>
                    Potential Savings {sortField() === 'savings' && (sortDirection() === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={thStyle}>Best Supplier</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={filteredComparisons()}>
                  {(comparison) => {
                    const matchDisplay = getMatchQualityDisplay(comparison.matchQuality);
                    const scoreDisplay = getScoreDisplay(comparison.averageSimilarity);
                    return (
                    <tr>
                      <td style={tdStyle}>
                        <div style={{ 'font-weight': '500' }}>{comparison.productName}</div>
                        <Show when={comparison.productCode}>
                          <div style={{ 'font-size': '0.75rem', color: 'var(--text-muted)' }}>
                            UPC: {comparison.productCode}
                          </div>
                        </Show>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.25rem' }}>
                          <span style={{
                            padding: '0.15rem 0.4rem',
                            background: matchDisplay.bgColor,
                            color: matchDisplay.color,
                            'border-radius': 'var(--border-radius-sm)',
                            'font-size': '0.7rem',
                            'font-weight': '600',
                            'text-align': 'center'
                          }}>
                            {matchDisplay.label}
                          </span>
                          <span style={{
                            padding: '0.1rem 0.3rem',
                            background: scoreDisplay.bgColor,
                            color: scoreDisplay.color,
                            'border-radius': 'var(--border-radius-sm)',
                            'font-size': '0.7rem',
                            'text-align': 'center'
                          }}>
                            {scoreDisplay.label}
                          </span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          background: comparison.offers.length > 1 ? 'var(--success-light)' : 'var(--gray-100)',
                          'border-radius': 'var(--border-radius-sm)',
                          'font-size': '0.875rem'
                        }}>
                          {comparison.offers.length}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, 'font-weight': '600', color: 'var(--success-color)' }}>
                        {formatCurrency(comparison.bestOffer?.price || 0)}
                      </td>
                      <td style={tdStyle}>
                        {formatCurrency(comparison.priceRange.min)} - {formatCurrency(comparison.priceRange.max)}
                      </td>
                      <td style={tdStyle}>
                        <Show when={comparison.offers.length > 1}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                            <span style={{ 'font-weight': '600', color: 'var(--success-color)' }}>
                              {formatCurrency(comparison.priceRange.max - comparison.priceRange.min)}
                            </span>
                            <span style={{
                              'font-size': '0.75rem',
                              color: 'var(--success-color)',
                              background: 'var(--success-light)',
                              padding: '0.125rem 0.375rem',
                              'border-radius': 'var(--border-radius-sm)'
                            }}>
                              {getSavingsPercent(comparison).toFixed(1)}%
                            </span>
                          </div>
                        </Show>
                        <Show when={comparison.offers.length <= 1}>
                          <span style={{ color: 'var(--text-muted)' }}>--</span>
                        </Show>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: 'var(--primary-color)', 'font-weight': '500' }}>
                          {comparison.bestOffer?.supplierName || '--'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => setSelectedProduct(comparison)}
                          style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '0.375rem 0.75rem',
                            'border-radius': 'var(--border-radius-sm)',
                            cursor: 'pointer',
                            'font-size': '0.875rem'
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );}}
                </For>
              </tbody>
            </table>

            <Show when={filteredComparisons().length === 0}>
              <div style={{
                padding: '2rem',
                'text-align': 'center',
                color: 'var(--text-muted)'
              }}>
                No products to compare. Upload at least 2 supplier offers.
              </div>
            </Show>
          </div>
        </Card>
      </Show>

      {/* Product Detail Modal */}
      <Show when={selectedProduct()}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          'justify-content': 'center',
          'align-items': 'center',
          'z-index': 1000
        }} onClick={() => setSelectedProduct(null)}>
          <Card style={{ width: '90%', 'max-width': '700px', 'max-height': '80vh', overflow: 'auto' }}>
            <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
              <div style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'margin-bottom': '1.5rem'
              }}>
                <h3 style={{ 'font-weight': '600' }}>{selectedProduct()?.productName}</h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    'font-size': '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(4, 1fr)',
                gap: '1rem',
                'margin-bottom': '1.5rem',
                padding: '1rem',
                background: 'var(--gray-50)',
                'border-radius': 'var(--border-radius-sm)'
              }}>
                <div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Best Price</div>
                  <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: 'var(--success-color)' }}>
                    {formatCurrency(selectedProduct()?.bestOffer?.price || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Average Price</div>
                  <div style={{ 'font-size': '1.25rem', 'font-weight': '600' }}>
                    {formatCurrency(selectedProduct()?.averagePrice || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Potential Savings</div>
                  <div style={{ 'font-size': '1.25rem', 'font-weight': '600', color: 'var(--success-color)' }}>
                    {formatCurrency((selectedProduct()?.priceRange.max || 0) - (selectedProduct()?.priceRange.min || 0))}
                  </div>
                </div>
                <div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>Match Quality</div>
                  {(() => {
                    const quality = getMatchQualityDisplay(selectedProduct()?.matchQuality || 'exact');
                    return (
                      <div style={{
                        'font-size': '1rem',
                        'font-weight': '600',
                        color: quality.color,
                        display: 'flex',
                        'align-items': 'center',
                        gap: '0.5rem'
                      }}>
                        {quality.label}
                        <span style={{
                          'font-size': '0.8rem',
                          padding: '0.1rem 0.4rem',
                          background: quality.bgColor,
                          'border-radius': 'var(--border-radius-sm)'
                        }}>
                          {selectedProduct()?.averageSimilarity || 100}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* UPC/Code Info */}
              <Show when={selectedProduct()?.productCode}>
                <div style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--info-light)',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '1rem',
                  'font-size': '0.875rem'
                }}>
                  <strong>UPC/Code:</strong> {selectedProduct()?.productCode}
                </div>
              </Show>

              <h4 style={{ 'margin-bottom': '1rem', 'font-weight': '600' }}>All Offers</h4>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Supplier</th>
                    <th style={thStyle}>Product Name</th>
                    <th style={thStyle}>Match</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Qty</th>
                    <th style={thStyle}>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={selectedProduct()?.offers.sort((a, b) => a.productOffer.unitPrice - b.productOffer.unitPrice)}>
                    {(offer) => {
                      const simDisplay = getScoreDisplay(offer.similarity?.score || 100);
                      return (
                      <tr style={{ background: offer.isBestPrice ? 'var(--success-light)' : 'transparent' }}>
                        <td style={tdStyle}>
                          <span style={{ 'font-weight': offer.isBestPrice ? '600' : '400' }}>
                            {offer.supplierName}
                            {offer.isBestPrice && ' ⭐'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, 'font-size': '0.8rem' }}>
                          {offer.productOffer.productName}
                          <Show when={offer.productOffer.productCode}>
                            <div style={{ 'font-size': '0.7rem', color: 'var(--text-muted)' }}>
                              {offer.productOffer.productCode}
                            </div>
                          </Show>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.15rem' }}>
                            <span style={{
                              padding: '0.1rem 0.3rem',
                              background: simDisplay.bgColor,
                              color: simDisplay.color,
                              'border-radius': 'var(--border-radius-sm)',
                              'font-size': '0.7rem',
                              'text-align': 'center'
                            }}>
                              {simDisplay.label}
                            </span>
                            <Show when={offer.similarity?.upcMatch}>
                              <span style={{
                                'font-size': '0.65rem',
                                color: 'var(--success-color)',
                                'text-align': 'center'
                              }}>
                                UPC Match
                              </span>
                            </Show>
                            <Show when={offer.similarity?.upcMismatch}>
                              <span style={{
                                'font-size': '0.65rem',
                                color: 'var(--danger-color)',
                                'text-align': 'center'
                              }}>
                                UPC Diff
                              </span>
                            </Show>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, 'font-weight': '600' }}>
                          {formatCurrency(offer.productOffer.unitPrice)}
                        </td>
                        <td style={tdStyle}>{offer.productOffer.quantity} {offer.productOffer.unit}</td>
                        <td style={tdStyle}>
                          <Show when={!offer.isBestPrice && offer.priceDifference}>
                            <span style={{ color: 'var(--danger-color)' }}>
                              +{formatCurrency(offer.priceDifference!)} ({offer.priceDifferencePercent?.toFixed(1)}%)
                            </span>
                          </Show>
                          <Show when={offer.isBestPrice}>
                            <span style={{ color: 'var(--success-color)' }}>Best Price</span>
                          </Show>
                        </td>
                      </tr>
                    );}}
                  </For>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </Show>
    </div>
  );
};

export default ProductOffersComparison;
