import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { useTranslation } from '../../../translations';
import { inventoryStore, Product, Location } from '../stores/inventoryStore';
import { inventoryApi } from '../../../services/apiAdapter';
import { Button } from '../../ui';
import { authStore } from '../../../stores/authStore';
import { devLog } from '../../../services/utils';

interface InventoryCountingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocationId?: string;
}

const InventoryCountingSheet: Component<InventoryCountingSheetProps> = (props) => {
  const { t } = useTranslation();
  const [products, setProducts] = createSignal<Product[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [selectedLocation, setSelectedLocation] = createSignal<string>('all');
  const [selectedCategory, setSelectedCategory] = createSignal<string>('all');
  const [sortBy, setSortBy] = createSignal<'name' | 'sku' | 'category'>('name');
  const [showPrintView, setShowPrintView] = createSignal(false);

  devLog('InventoryCountingSheet rendered, isOpen:', props.isOpen);

  // Load all products when component mounts
  onMount(async () => {
    await loadAllProducts();
    if (props.selectedLocationId) {
      setSelectedLocation(props.selectedLocationId);
    }
  });

  
  const selectedLocationHandler = (v:string) => {
      setSelectedLocation(v)
     // loadAllProducts()
  }

  const selectedCategoryHandler = (v:string) => {
    setSelectedCategory(v);
  //  loadAllProducts()
}

  const loadAllProducts = async () => {
    try {
      setLoading(true);
      devLog('Loading products for counting sheet...');
      
      let query = ""
      if(selectedLocation() && selectedLocation() !== "all"){
       // query += " "+selectedLocation();
      }
      if(selectedCategory() && selectedCategory() !== "all"){
        query += " "+  selectedCategory();
      }

      if(!query.trim()){
        query = authStore.getBusinessId();
      }

      // Load products from API
      const apiResults = await inventoryApi.getProducts(query);
      devLog('API Results:', query , apiResults);
      
      if (!apiResults || typeof apiResults !== 'object') {
        console.warn('No API results, using local store');
        setProducts(inventoryStore.products);
        return;
      }
      
      const productsArr: string[] = Object.keys(apiResults);
      devLog('Products count:', productsArr.length);

      const parseProduct = (itemId: string): Product => {
        let rec = apiResults as Record<string, any>;
        let v = rec[itemId] as Record<string, any>;
        
        return {
          id: itemId,
          name: v.name || 'Unknown Product',
          businessId: v.businessId || '',
          sku: v.code || v.sku || '',
          UPC: v.UPC || '',
          numCode: v.codeN || '',
          category: v.category || 'General',
          unitCost: v.unitCost || 0,
          unitOfMeasure: v.unitOfMeasure || 'pcs',
          minStockLevel: v.minStockLevel || 0,
          maxStockLevel: v.maxStockLevel || 100,
          isActive: v.isActive !== false,
          description: v.description || '',
          createdDate: v.createdAt || new Date().toISOString(),
          lastModified: v.updatedAt || new Date().toISOString(),
          sellingPrice: parseFloat(v.sellingPrice || v.price || '0'),
        } as Product;
      };

      const allProducts = productsArr.map(parseProduct);
      devLog('Parsed products:', allProducts.length);
      setProducts(allProducts);
    } catch (error) {
      console.error('Failed to load products from API:', error);
      devLog('Using local store as fallback');
      setProducts(inventoryStore.products);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = createMemo(() => {
    const uniqueCategories = [...new Set(products().map(p => p.category).filter(c => c))];
    return uniqueCategories.sort();
  });

  // Filter and sort products
  const filteredAndSortedProducts = createMemo(() => {
    let filtered = products().filter(p => p.isActive);
    
    // Filter by category
    if (selectedCategory() !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory());
    }
    
    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy()) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'sku':
          return a.sku.localeCompare(b.sku);
        case 'category':
          return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  });

  // Get locations for dropdown
  const locations = createMemo(() => inventoryStore.getActiveLocations());

  // Get current stock for display (optional)
  const getCurrentStock = (productId: string, locationId?: string) => {
    if (locationId && locationId !== 'all') {
      const stock = inventoryStore.getStockByProductAndLocation(productId, locationId);
      return stock?.quantity || 0;
    }
    return inventoryStore.getTotalStockByProduct(productId);
  };

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the counting sheet');
      return;
    }

    const printContent = generatePrintContent();
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  };

  const generatePrintContent = () => {
    const productsHtml = filteredAndSortedProducts().map((product, index) => {
      const systemQty = getCurrentStock(product.id, selectedLocation() !== 'all' ? selectedLocation() : undefined);
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 8px; font-family: monospace;">${product.sku}</td>
          <td style="border: 1px solid #000; padding: 8px;">
            <div style="font-weight: 500;">${product.name}</div>
            ${product.UPC ? `<div style="font-size: 0.8em; color: #666;">UPC: ${product.UPC}</div>` : ''}
          </td>
          <td style="border: 1px solid #000; padding: 8px;">${product.category}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${product.unitOfMeasure}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${systemQty}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; background-color: #f9f9f9;">________</td>
          <td style="border: 1px solid #000; padding: 8px;">_______________</td>
        </tr>
      `;
    }).join('');

    // Get current translations
    const countInstructions = t('inventory.countInstructions', [
      'Count all items physically present at this location',
      'Write the actual count in the "Physical Count" column',
      'Leave blank if item is not found',
      'Note any discrepancies in the "Notes" column',
      'Sign and date when complete'
    ]);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t('inventory.countingSheet', 'Inventory Counting Sheet')} - ${formatDate()}</title>
        <style>
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 0;
          }
          h1 {
            text-align: center;
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .header-info {
            text-align: center;
            margin-bottom: 20px;
          }
          .instructions {
            background-color: #f0f0f0;
            padding: 10px;
            margin-bottom: 20px;
            border: 1px solid #ccc;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background-color: #333;
            color: white;
            padding: 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #000;
          }
          .summary-table {
            width: 50%;
            margin: 20px auto;
          }
          .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            width: 45%;
            text-align: center;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            margin-bottom: 5px;
            height: 30px;
          }
          @media print {
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${t('inventory.inventoryCountingSheetTitle', 'INVENTORY COUNTING SHEET')}</h1>
        <div class="header-info">
          <p><strong>${t('inventory.location', 'Location')}:</strong> ${selectedLocationName()}</p>
          <p><strong>${t('inventory.category', 'Category')}:</strong> ${selectedCategory() === 'all' ? t('inventory.allCategories', 'All Categories') : selectedCategory()}</p>
          <p><strong>${t('common.date', 'Date')}:</strong> ${formatDate()}</p>
          <p style="margin-top: 10px;">
            <span style="margin-right: 30px;">${t('inventory.countedBy', 'Counted by')}: _________________________</span>
            <span>${t('inventory.verifiedBy', 'Verified by')}: _________________________</span>
          </p>
        </div>
        
        <div class="instructions">
          <h3 style="margin: 0 0 10px 0;">${t('inventory.instructions', 'Instructions')}:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${Array.isArray(countInstructions) ? 
              countInstructions.map(instruction => `<li>${instruction}</li>`).join('') :
              `<li>${t('inventory.countInstructions[0]', 'Count all items physically present at this location')}</li>
               <li>${t('inventory.countInstructions[1]', 'Write the actual count in the "Physical Count" column')}</li>
               <li>${t('inventory.countInstructions[2]', 'Leave blank if item is not found')}</li>
               <li>${t('inventory.countInstructions[3]', 'Note any discrepancies in the "Notes" column')}</li>
               <li>${t('inventory.countInstructions[4]', 'Sign and date when complete')}</li>`
            }
          </ul>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">#</th>
              <th style="width: 12%;">${t('inventory.sku', 'SKU')}</th>
              <th style="width: 25%;">${t('inventory.productName', 'Product Name')}</th>
              <th style="width: 12%;">${t('inventory.category', 'Category')}</th>
              <th style="width: 8%; text-align: center;">${t('inventory.unit', 'Unit')}</th>
              <th style="width: 10%; text-align: center;">${t('inventory.systemQty', 'System Qty')}</th>
              <th style="width: 12%; text-align: center; background-color: #f0f0f0;">${t('inventory.physicalCount', 'Physical Count')}</th>
              <th style="width: 16%;">${t('common.notes', 'Notes')}</th>
            </tr>
          </thead>
          <tbody>
            ${productsHtml}
          </tbody>
        </table>
        
        <table class="summary-table">
          <tr>
            <td style="border: 1px solid #000; padding: 8px; font-weight: bold; background-color: #f0f0f0;">
              ${t('inventory.totalProductsListed', 'Total Products Listed')}:
            </td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">
              ${filteredAndSortedProducts().length}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 8px; font-weight: bold; background-color: #f0f0f0;">
              ${t('inventory.itemsCounted', 'Items Counted')}:
            </td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center;">
              ___________
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 8px; font-weight: bold; background-color: #f0f0f0;">
              ${t('inventory.discrepanciesFound', 'Discrepancies Found')}:
            </td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center;">
              ___________
            </td>
          </tr>
        </table>
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>${t('inventory.counterSignature', 'Counter Signature')}</p>
            <p>${t('common.date', 'Date')}: _______________</p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>${t('inventory.supervisorSignature', 'Supervisor Signature')}</p>
            <p>${t('common.date', 'Date')}: _______________</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedLocationName = createMemo(() => {
    if (selectedLocation() === 'all') return 'All Locations';
    const location = locations().find(l => l.id === selectedLocation());
    return location?.name || 'Unknown Location';
  });




  const Initialize = async (qry: string) => {
    await inventoryStore.fecthInventory(qry)
    await inventoryStore.fecthProduct(qry)
  }
  

  onMount(()=>{
    let qry = authStore.getBusinessId();
    Initialize(qry);
  })


  return (
    <Show when={props.isOpen}>
      <div style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'rgba(0, 0, 0, 0.5)',
        'z-index': '1000',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center'
      }}>
        <div style={{
          background: 'white',
          'border-radius': 'var(--border-radius)',
          padding: showPrintView() ? '0' : '2rem',
          width: showPrintView() ? '100%' : '90%',
          height: showPrintView() ? '100%' : '90%',
          'max-width': showPrintView() ? 'none' : '1200px',
          'max-height': showPrintView() ? 'none' : '90vh',
          'overflow-y': 'auto',
          position: 'relative'
        }}>
          {/* Header Controls (hidden in print) */}
          <div class={showPrintView() ? 'no-print' : ''}>
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '2rem',
              'border-bottom': '1px solid var(--border-color)',
              'padding-bottom': '1rem'
            }}>
              <h2 style={{ margin: '0', 'font-size': '1.5rem' }}>
                {t('inventory.countingSheet', 'Inventory Counting Sheet')}
              </h2>
              <button
                onClick={props.onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  'font-size': '1.5rem',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                ×
              </button>
            </div>

            {/* Configuration Controls */}
            <div style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              'margin-bottom': '2rem',
              padding: '1rem',
              background: 'var(--surface-color)',
              'border-radius': 'var(--border-radius)'
            }}>
              <div>
                <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                  {t('inventory.location', 'Location')}:
                </label>
                <select
                  value={selectedLocation()}
                  onChange={(e) => selectedLocationHandler(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}
                >
                  <option value="all">{t('inventory.allLocations', 'All Locations')}</option>
                  <For each={locations()}>
                    {(location) => (
                      <option value={location.id}>{location.name}</option>
                    )}
                  </For>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                  {t('inventory.category', 'Category')}:
                </label>
                <select
                  value={selectedCategory()}
                  onChange={(e) => selectedCategoryHandler(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}
                >
                  <option value="all">{t('products.allCategories', 'All Categories')}</option>
                  <For each={categories()}>
                    {(category) => (
                      <option value={category}>{category}</option>
                    )}
                  </For>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                  {t('inventory.sortBy', 'Sort By')}:
                </label>
                <select
                  value={sortBy()}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}
                >
                  <option value="name">{t('inventory.productName', 'Product Name')}</option>
                  <option value="sku">{t('inventory.sku', 'SKU')}</option>
                  <option value="category">{t('inventory.category', 'Category')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', 'align-items': 'end', gap: '1rem' }}>
                <Button
                  variant="primary"
                  onClick={handlePrint}
                  disabled={loading()}
                >
                  🖨️ {t('common.print', 'Print')}
                </Button>
                <Button
                  variant="outline"
                  onClick={loadAllProducts}
                  disabled={loading()}
                >
                  🔄 {t('common.refresh', 'Refresh')}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview Content */}
          <div style={{ padding: '1rem' }}>
            <Show
              when={!loading()}
              fallback={
                <div style={{ 'text-align': 'center', padding: '2rem' }}>
                  Loading products...
                </div>
              }
            >
              <div style={{
                background: 'var(--surface-color)',
                padding: '2rem',
                'border-radius': 'var(--border-radius)',
                'text-align': 'center'
              }}>
                <h3 style={{ 'margin-bottom': '1rem' }}>
                  {t('inventory.countingSheetReady', 'Counting Sheet Ready')}
                </h3>
               
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  'margin-bottom': '2rem',
                  'text-align': 'left'
                }}>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--background-color)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                      {t('inventory.location', 'Location')}:
                    </div>
                    <div>{selectedLocationName()}</div>
                  </div>
                  
                  <div style={{
                    padding: '1rem',
                    background: 'var(--background-color)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                      {t('inventory.category', 'Category')}:
                    </div>
                    <div>{selectedCategory() === 'all' ? t('products.allCategories', 'All Categories') : selectedCategory()}</div>
                  </div>
                  
                  <div style={{
                    padding: '1rem',
                    background: 'var(--background-color)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                      {t('inventory.sortedBy', 'Sorted By')}:
                    </div>
                    <div>
                      {sortBy() === 'name' && t('inventory.productName', 'Product Name')}
                      {sortBy() === 'sku' && t('inventory.sku', 'SKU')}
                      {sortBy() === 'category' && t('inventory.category', 'Category')}
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '1rem',
                    background: 'var(--background-color)',
                    'border-radius': 'var(--border-radius-sm)'
                  }}>
                    <div style={{ 'font-weight': '600', 'margin-bottom': '0.5rem' }}>
                      {t('inventory.totalProducts', 'Total Products')}:
                    </div>
                    <div style={{ 'font-size': '1.25rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
                      {filteredAndSortedProducts().length}
                    </div>
                  </div>
                </div>
                
                <div style={{
                  padding: '1rem',
                  background: '#fff3cd',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '2rem'
                }}>
                  <p style={{ margin: '0', color: '#856404' }}>
                    💡 {t('inventory.printTip', 'Click the Print button to generate a PDF counting sheet. Make sure pop-ups are enabled for this site.')}
                  </p>
                </div>
                
                <Button
                  variant="primary"
                  size="large"
                  onClick={handlePrint}
                  disabled={loading() || filteredAndSortedProducts().length === 0}
                >
                  🖨️ {t('inventory.generatePDF', 'Generate PDF Counting Sheet')}
                </Button>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default InventoryCountingSheet;