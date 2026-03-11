/**
 * BulkProductImporter Component
 *
 * Tool to import products from a JSON list.
 * Checks if UPC exists before adding to prevent duplicates.
 */

import { Component, createSignal, For, Show } from 'solid-js';
import { Button, Card, FormInput } from '../../ui';
import { inventoryStore, Product } from '../stores/inventoryStore';
import { productsApi } from '../../../services/apiAdapter';
import { authStore } from '../../../stores/authStore';
import { useTranslation } from '../../../translations';
import { devLog, generateShortCode } from '../../../services/utils';
import { parsePDFToImportJson } from '../../offers/services/pdfParser';

interface ImportProduct {
  // Standard fields
  name?: string;
  sku?: string;
  UPC?: string;
  upc?: string;
  description?: string;
  category?: string;
  unitOfMeasure?: string;
  unitCost?: number;
  sellingPrice?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  productImageUrl?: string;
  // Alternative schema fields
  expiration?: string;
  qty_in_case?: number;
  wholesale_case_price?: number;
  b2b_case_price?: number;
  // Nested price structure (from catalog format)
  unit?: number;
  prices?: {
    wholesale?: number;
    b2b?: number;
    b2b_unit?: number;
    b2b_min_10?: number;
    b2b_min_20?: number;
  };
  in_stock?: boolean;
  // Spanish field names format
  sdk?: string;           // Product code/SKU
  unidades_caja?: number; // Units per case
  origen?: string;        // Origin country
  precio_unidad?: number; // Unit price (cost)
  precio_caja?: number;   // Case price (selling)
}

// Catalog format structure
interface CatalogFormat {
  catalogs: {
    [key: string]: {
      category: string;
      products: ImportProduct[];
    };
  };
  metadata?: {
    generated_date?: string;
    source_files?: string[];
    total_products?: Record<string, number>;
  };
}

interface ImportResult {
  product: ImportProduct;
  status: 'added' | 'skipped' | 'error';
  message: string;
}

const BulkProductImporter: Component = () => {
  const { t } = useTranslation();

  const [jsonInput, setJsonInput] = createSignal('');
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [isParsing, setIsParsing] = createSignal(false);
  const [results, setResults] = createSignal<ImportResult[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [existingProducts, setExistingProducts] = createSignal<Product[]>([]);
  const [showResults, setShowResults] = createSignal(false);
  const [pdfFileName, setPdfFileName] = createSignal<string | null>(null);

  // Load existing products on mount
  const loadExistingProducts = async () => {
    try {
      const products = await productsApi.getAll();
      setExistingProducts(products || []);
    } catch (err) {
      console.error('Error loading existing products:', err);
      // Fallback to local store
      setExistingProducts(inventoryStore.products || []);
    }
  };

  // Check if UPC exists
  const checkUPCExists = (upc: string): Product | undefined => {
    if (!upc) return undefined;
    const normalizedUpc = upc.trim().toLowerCase();
    //devLog(existingProducts())
    return existingProducts().find(p =>
      p.UPC && p.UPC.trim().toLowerCase() === normalizedUpc
    );
  };

  // Check if SKU exists
  const checkSKUExists = (sku: string): Product | undefined => {
    if (!sku) return undefined;
    const normalizedSku = sku.trim().toLowerCase();
    return existingProducts().find(p =>
      p.sku && p.sku.trim().toLowerCase() === normalizedSku
    );
  };

  // Parse JSON input - handles flat array, single object, or nested catalog format
  const parseJsonInput = (): ImportProduct[] | null => {
    try {
      const input = jsonInput().trim();
      if (!input) {
        setError('Please enter JSON data');
        return null;
      }

      const parsed = JSON.parse(input);

      let products: ImportProduct[] = [];

      // Check if this is a nested catalog format (has "catalogs" key)
      if (parsed.catalogs && typeof parsed.catalogs === 'object') {
        devLog('📦 Detected nested catalog format');
        const catalogData = parsed as CatalogFormat;

        // Extract products from all catalogs
        for (const [catalogKey, catalog] of Object.entries(catalogData.catalogs)) {
          if (catalog.products && Array.isArray(catalog.products)) {
            devLog(`📂 Processing catalog: ${catalogKey} (${catalog.category}) - ${catalog.products.length} products`);

            // Add category to each product and flatten
            for (const product of catalog.products) {
              // Skip products without UPC or out of stock with no prices
              const hasValidUpc = product.upc && product.upc !== 'null' && product.upc !== '0';
              const hasPrice = product.prices ?
                (product.prices.wholesale || product.prices.b2b || product.prices.b2b_unit) :
                (product.wholesale_case_price || product.b2b_case_price);
              const isInStock = product.in_stock !== false;

              if (!hasPrice || !isInStock) {
                devLog(`⏭️ Skipping (no price or out of stock): ${product.description}`);
                continue;
              }

              products.push({
                ...product,
                category: catalog.category.split('/')[0].trim(), // Use first part of category
              });
            }
          }
        }

        devLog(`✅ Total products extracted from catalogs: ${products.length}`);
      } else {
        // Handle both array and single object (flat format)
        products = Array.isArray(parsed) ? parsed : [parsed];
      }

      // Validate that each item has at least a name or description
      for (const product of products) {
        if (!product.name && !product.description) {
          setError('Each product must have a "name" or "description" field');
          return null;
        }
      }

      return products;
    } catch (err) {
      setError(`Invalid JSON: ${err instanceof Error ? err.message : 'Parse error'}`);
      return null;
    }
  };

  // Import products
  const handleImport = async () => {
    setError(null);
    setResults([]);
    setShowResults(false);

    const products = parseJsonInput();
    if (!products) return;

    setIsProcessing(true);

    try {
      // First, load existing products to check for duplicates
      await loadExistingProducts();

      const importResults: ImportResult[] = [];
      const businessId = authStore.getBusinessId();

      for (const product of products) {
        // Get and clean UPC - remove spaces and non-numeric characters
        const rawUpc = product.UPC || product.upc;
        const upc = rawUpc ? rawUpc.replace(/\s+/g, '').replace(/[^0-9]/g, '') : '';
        const sku = product.sku || product.sdk;

        // Check if UPC exists (skip empty or invalid UPCs)
        if (upc && upc.length >= 8) {
          const existingByUpc = checkUPCExists(upc);
          if (existingByUpc) {
            importResults.push({
              product,
              status: 'skipped',
              message: `UPC "${upc}" already exists (Product: ${existingByUpc.name})`
            });
            continue;
          }
        }

        // Check if SKU exists
        if (sku) {
          const existingBySku = checkSKUExists(sku);
          if (existingBySku) {
            importResults.push({
              product,
              status: 'skipped',
              message: `SKU "${sku}" already exists (Product: ${existingBySku.name})`
            });
            continue;
          }
        }

        // Prepare product data - handle multiple schemas:
        // 1. Standard: unitCost, sellingPrice
        // 2. Flat alternative: b2b_case_price, wholesale_case_price
        // 3. Nested prices: prices.b2b, prices.wholesale, prices.b2b_unit
        // 4. Spanish format: precio_unidad, precio_caja, unidades_caja
        const productName = product.name || product.description || 'Unknown Product';

        // Extract prices from nested or flat structure
        let productUnitCost = product.unitCost ?? 0;
        let productSellingPrice = product.sellingPrice ?? 0;

        if (product.prices) {
          // Nested price structure - use b2b/b2b_unit as cost, wholesale as selling price
          productUnitCost = product.prices.b2b ?? product.prices.b2b_unit ?? product.prices.b2b_min_10 ?? 0;
          productSellingPrice = product.prices.wholesale ?? productUnitCost;
        } else if (product.precio_unidad !== undefined || product.precio_caja !== undefined) {
          // Spanish format: precio_unidad = unit cost, precio_caja = case price (selling)
          productUnitCost = product.precio_unidad ?? 0;
          productSellingPrice = product.precio_caja ?? productUnitCost;
        } else {
          // Flat alternative schema
          productUnitCost = product.unitCost ?? product.b2b_case_price ?? 0;
          productSellingPrice = product.sellingPrice ?? product.wholesale_case_price ?? productUnitCost;
        }

        const qtyInCase = product.qty_in_case ?? product.unidades_caja ?? product.unit ?? 1;
        const productUnitOfMeasure = product.unitOfMeasure || (qtyInCase > 1 ? `case/${qtyInCase}` : 'unit');

        // Use sdk as SKU if available
        const productSku = product.sku || product.sdk || `SKU-${generateShortCode(7)}-${generateShortCode(5)}`;

        // Build notes with additional info
        const notes: string[] = [];
        if (product.expiration && product.expiration !== 'N/A') notes.push(`Exp: ${product.expiration}`);
        if (qtyInCase > 1) notes.push(`Qty/Case: ${qtyInCase}`);
        if (product.origen) notes.push(`Origin: ${product.origen}`);

        // Clean UPC - remove spaces and special characters
        const cleanUpc = upc ? upc.replace(/\s+/g, '').replace(/[^0-9]/g, '') : '';

        const productData = {
          name: productName,
          sku: productSku,
          UPC: cleanUpc,
          description: notes.length > 0 ? notes.join(' | ') : (product.description || ''),
          category: product.category || 'General',
          unitOfMeasure: productUnitOfMeasure,
          unitCost: productUnitCost,
          sellingPrice: productSellingPrice,
          minStockLevel: product.minStockLevel || 0,
          maxStockLevel: product.maxStockLevel || 1000,
          isActive: true,
          businessId: businessId,
          productImageUrl: product.productImageUrl || '',
        };

        try {
          // Add product via API
           await inventoryStore.addProduct(productData);
          //devLog({productData})

          importResults.push({
            product,
            status: 'added',
            message: `Product added: ${productName} (Cost: $${productUnitCost}, Price: $${productSellingPrice})`
          });

          // Refresh existing products list after each add
          const updatedProducts = [...existingProducts(), productData as Product];
          setExistingProducts(updatedProducts);

        } catch (err) {
          importResults.push({
            product,
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to add product'
          });
        }
      }

      setResults(importResults);
      setShowResults(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle JSON file upload
  const handleJsonFileUpload = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
      setError(null);
      setPdfFileName(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  // Handle PDF file upload
  const handlePdfFileUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    setIsParsing(true);
    setError(null);
    setPdfFileName(file.name);

    try {
      // Parse PDF and convert to import JSON
      const jsonString = await parsePDFToImportJson(file);
      setJsonInput(jsonString);

      // Parse to show count
      const products = JSON.parse(jsonString);
      devLog(`📄 PDF parsed: ${products.length} products found`);

    } catch (err) {
      console.error('PDF parsing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse PDF');
      setPdfFileName(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Get summary stats
  const getSummary = () => {
    const r = results();
    return {
      total: r.length,
      added: r.filter(r => r.status === 'added').length,
      skipped: r.filter(r => r.status === 'skipped').length,
      errors: r.filter(r => r.status === 'error').length
    };
  };

  // Sample JSON template
  const sampleJson = `[
  {
    "upc": "75669110742",
    "description": "ARROZ CON FRIJOLES NEGRO PRE COCIDO, IBERIA 6 U (54 OZ)",
    "expiration": "DIC/28",
    "qty_in_case": 6,
    "wholesale_case_price": 39,
    "b2b_case_price": 34
  },
  {
    "upc": "123456789012",
    "description": "OTRO PRODUCTO DE EJEMPLO",
    "qty_in_case": 12,
    "wholesale_case_price": 25.50,
    "b2b_case_price": 22.00
  }
]`;

  const loadSample = () => {
    setJsonInput(sampleJson);
    setError(null);
  };

  return (
    <div style={{ padding: '1.5rem', 'max-width': '1000px', margin: '0 auto' }}>
      <Card>
        <div style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>
            {t('inventory.bulkImport', 'Importar Productos en Lote')}
          </h2>
          <p style={{ color: 'var(--text-muted)', 'margin-bottom': '1.5rem' }}>
            {t('inventory.bulkImportDescription', 'Importa productos desde un PDF de proveedor o archivo JSON. El sistema extrae automáticamente los productos del PDF y genera el JSON para revisión.')}
          </p>

          {/* File Upload Options */}
          <div style={{ 'margin-bottom': '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap', 'align-items': 'center' }}>
              {/* PDF Upload */}
              <label style={{
                display: 'inline-flex',
                'align-items': 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                border: 'none',
                'border-radius': 'var(--border-radius-sm)',
                cursor: isParsing() ? 'wait' : 'pointer',
                'font-weight': '600',
                color: 'white',
                opacity: isParsing() ? 0.7 : 1
              }}>
                {isParsing() ? '⏳ Procesando PDF...' : '📄 Subir PDF de Proveedor'}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfFileUpload}
                  disabled={isParsing()}
                  style={{ display: 'none' }}
                />
              </label>

              {/* JSON Upload */}
              <label style={{
                display: 'inline-flex',
                'align-items': 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--surface-color)',
                border: '2px dashed var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                cursor: 'pointer',
                'font-weight': '500'
              }}>
                📁 Subir JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJsonFileUpload}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Sample Button */}
              <Button
                variant="secondary"
                onClick={loadSample}
              >
                📋 {t('common.loadSample', 'Cargar Ejemplo')}
              </Button>
            </div>

            {/* PDF File Name indicator */}
            <Show when={pdfFileName()}>
              <div style={{
                'margin-top': '0.75rem',
                padding: '0.5rem 1rem',
                background: '#dcfce7',
                border: '1px solid #86efac',
                'border-radius': 'var(--border-radius-sm)',
                color: '#166534',
                display: 'flex',
                'align-items': 'center',
                gap: '0.5rem'
              }}>
                <span>✅ PDF procesado:</span>
                <strong>{pdfFileName()}</strong>
                <span style={{ 'margin-left': 'auto', 'font-size': '0.875rem' }}>
                  Revise el JSON generado abajo antes de importar
                </span>
              </div>
            </Show>
          </div>

          {/* JSON Input */}
          <div style={{ 'margin-bottom': '1rem' }}>
            <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
              {t('inventory.jsonData', 'Datos JSON')}
            </label>
            <textarea
              value={jsonInput()}
              onInput={(e) => {
                setJsonInput(e.currentTarget.value);
                setError(null);
              }}
              placeholder={`Pegue su JSON aquí...\n\nFormato esperado:\n${sampleJson}`}
              style={{
                width: '100%',
                'min-height': '300px',
                padding: '1rem',
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius-sm)',
                'font-family': 'monospace',
                'font-size': '0.875rem',
                resize: 'vertical',
                background: 'var(--surface-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Error Message */}
          <Show when={error()}>
            <div style={{
              padding: '0.75rem 1rem',
              'margin-bottom': '1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              'border-radius': 'var(--border-radius-sm)',
              color: '#dc2626'
            }}>
              ⚠️ {error()}
            </div>
          </Show>

          {/* Import Button */}
          <div style={{ width: '100%' }}>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={isProcessing() || !jsonInput().trim()}
            >
              {isProcessing() ? (
                '⏳ Procesando...'
              ) : (
                `📥 ${t('inventory.importProducts', 'Importar Productos')}`
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      <Show when={showResults()}>
        <div style={{ 'margin-top': '1.5rem' }}>
        <Card>
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>
              {t('inventory.importResults', 'Resultados de Importación')}
            </h3>

            {/* Summary */}
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '1rem',
              'margin-bottom': '1.5rem'
            }}>
              <div style={{
                padding: '1rem',
                background: 'var(--surface-color)',
                'border-radius': 'var(--border-radius-sm)',
                'text-align': 'center',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold' }}>
                  {getSummary().total}
                </div>
                <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                  Total
                </div>
              </div>
              <div style={{
                padding: '1rem',
                background: '#d4edda',
                'border-radius': 'var(--border-radius-sm)',
                'text-align': 'center',
                border: '1px solid #c3e6cb'
              }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#155724' }}>
                  {getSummary().added}
                </div>
                <div style={{ 'font-size': '0.875rem', color: '#155724' }}>
                  Agregados
                </div>
              </div>
              <div style={{
                padding: '1rem',
                background: '#fff3cd',
                'border-radius': 'var(--border-radius-sm)',
                'text-align': 'center',
                border: '1px solid #ffc107'
              }}>
                <div style={{ 'font-size': '1.5rem', 'font-weight': 'bold', color: '#856404' }}>
                  {getSummary().skipped}
                </div>
                <div style={{ 'font-size': '0.875rem', color: '#856404' }}>
                  Omitidos
                </div>
              </div>
              <div style={{
                padding: '1rem',
                background: getSummary().errors > 0 ? '#f8d7da' : 'var(--surface-color)',
                'border-radius': 'var(--border-radius-sm)',
                'text-align': 'center',
                border: getSummary().errors > 0 ? '1px solid #f5c6cb' : '1px solid var(--border-color)'
              }}>
                <div style={{
                  'font-size': '1.5rem',
                  'font-weight': 'bold',
                  color: getSummary().errors > 0 ? '#721c24' : 'var(--text-primary)'
                }}>
                  {getSummary().errors}
                </div>
                <div style={{
                  'font-size': '0.875rem',
                  color: getSummary().errors > 0 ? '#721c24' : 'var(--text-muted)'
                }}>
                  Errores
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div style={{ 'max-height': '400px', 'overflow-y': 'auto' }}>
              <For each={results()}>
                {(result) => (
                  <div style={{
                    padding: '0.75rem 1rem',
                    'margin-bottom': '0.5rem',
                    background: result.status === 'added' ? '#d4edda'
                      : result.status === 'skipped' ? '#fff3cd'
                      : '#f8d7da',
                    'border-radius': 'var(--border-radius-sm)',
                    border: `1px solid ${
                      result.status === 'added' ? '#c3e6cb'
                      : result.status === 'skipped' ? '#ffc107'
                      : '#f5c6cb'
                    }`
                  }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                      <div>
                        <span style={{ 'font-weight': '600' }}>
                          {result.status === 'added' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌'}
                          {' '}{result.product.name}
                        </span>
                        <Show when={result.product.UPC || result.product.upc}>
                          <span style={{ 'margin-left': '0.5rem', color: 'var(--text-muted)', 'font-size': '0.875rem' }}>
                            (UPC: {result.product.UPC || result.product.upc})
                          </span>
                        </Show>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        'border-radius': '9999px',
                        'font-size': '0.75rem',
                        'font-weight': '500',
                        background: result.status === 'added' ? '#155724'
                          : result.status === 'skipped' ? '#856404'
                          : '#721c24',
                        color: 'white'
                      }}>
                        {result.status === 'added' ? 'AGREGADO'
                          : result.status === 'skipped' ? 'OMITIDO'
                          : 'ERROR'}
                      </span>
                    </div>
                    <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)', 'margin-top': '0.25rem' }}>
                      {result.message}
                    </div>
                  </div>
                )}
              </For>
            </div>

            {/* Clear Results */}
            <div style={{ 'margin-top': '1rem' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setResults([]);
                  setShowResults(false);
                  setJsonInput('');
                }}
              >
                {t('common.clear', 'Limpiar')}
              </Button>
            </div>
          </div>
        </Card>
        </div>
      </Show>
    </div>
  );
};

export default BulkProductImporter;
