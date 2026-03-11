import { Component, createSignal, createMemo, For, Show, onMount } from 'solid-js';
import { useTranslation } from '../../../translations';
import { inventoryStore, Product, Location, BulkMovementRequest, BulkMovementItem } from '../stores/inventoryStore';
import { inventoryApi } from '../../../services/apiAdapter';
import { Button } from '../../ui';
import { devLog, generateRandomId, generateRandomNUM, isNotEmpty } from '../../../services/utils';
import { authStore } from '../../../stores/authStore';
import { convertToCSV, downloadCSV as downloadCSVFile } from '../../../utils/csvUtils';

interface PhysicalCountEntry {
  productId: string;
  systemQuantity: number;
  physicalCount: number | null;
  notes: string;
  variance: number;
  product: Product;
}

interface PhysicalInventoryCountingFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocationId?: string;
}

const PhysicalInventoryCountingForm: Component<PhysicalInventoryCountingFormProps> = (props) => {
  const { t } = useTranslation();
  const [products, setProducts] = createSignal<Product[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [selectedLocation, setSelectedLocation] = createSignal<string>('all');
  const [selectedCategory, setSelectedCategory] = createSignal<string>('all');
  const [sortBy, setSortBy] = createSignal<'name' | 'sku' | 'category'>('name');
  const [countingEntries, setCountingEntries] = createSignal<PhysicalCountEntry[]>([]);
  const [countingStatus, setCountingStatus] = createSignal<'setup' | 'counting' | 'review'>('setup');





  const loadAllProducts = async () => {
    try {
      setLoading(true);
      
      // Load products from API
      const apiResults = await inventoryApi.getProducts(authStore.getBusinessId());
      
      if (!apiResults || typeof apiResults !== 'object') {
        console.warn('No API results, using local store');
        setProducts(inventoryStore.products);
        return;
      }
      
      const productsArr: string[] = Object.keys(apiResults);

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
      setProducts(allProducts);
    } catch (error) {
      console.error('Failed to load products from API:', error);
      setProducts(inventoryStore.products);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = createMemo(() => {
    const uniqueCategories = [...new Set(products().map(p => p.category).filter(c => c))]
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

  // Get current stock for display
  const getCurrentStock = (productId: string, locationId?: string) => {
    if (locationId && locationId !== 'all') {
      const stock = inventoryStore.getStockByProductAndLocation(productId, locationId);
      return stock?.quantity || 0;
    }
    return inventoryStore.getTotalStockByProduct(productId);
  };

  // Initialize counting entries
  const initializeCounting = () => {
    const entries: PhysicalCountEntry[] = filteredAndSortedProducts().map(product => {
      const systemQuantity = getCurrentStock(product.id, selectedLocation() !== 'all' ? selectedLocation() : undefined);
      return {
        productId: product.id,
        systemQuantity,
        physicalCount: null,
        notes: '',
        variance: 0,
        product
      };
    });
    
    setCountingEntries(entries);
    setCountingStatus('counting');
  };

  // Update physical count
  const updatePhysicalCount = (productId: string, count: number | null) => {
    setCountingEntries(prev => prev.map(entry => {
      if (entry.productId === productId) {
        const physicalCount = count;
        const variance = physicalCount !== null ? physicalCount - entry.systemQuantity : 0;
        return { ...entry, physicalCount, variance };
      }
      return entry;
    }));
  };

  // Update notes
  const updateNotes = (productId: string, notes: string) => {
    setCountingEntries(prev => prev.map(entry => 
      entry.productId === productId ? { ...entry, notes } : entry
    ));
  };

  // Calculate summary statistics
  const countingSummary = createMemo(() => {
    const entries = countingEntries();
    const totalProducts = entries.length;
    const countedProducts = entries.filter(e => e.physicalCount !== null).length;
    const variances = entries.filter(e => e.variance !== 0).length;
    const positiveVariances = entries.filter(e => e.variance > 0).length;
    const negativeVariances = entries.filter(e => e.variance < 0).length;
    
    return {
      totalProducts,
      countedProducts,
      remainingProducts: totalProducts - countedProducts,
      variances,
      positiveVariances,
      negativeVariances,
      isComplete: countedProducts === totalProducts
    };
  });

  // Generate CSV content for download
  const generateCSVContent = () => {
    const adjustments = countingEntries()
      .filter(entry => entry.physicalCount !== null && entry.variance !== 0);

    if (adjustments.length === 0) {
      return null;
    }

    // CSV Headers
    const headers = [
      t('inventory.product', 'Product'),
      t('inventory.sku', 'SKU'),
      t('inventory.category', 'Category'),
      t('inventory.location', 'Location'),
      t('inventory.systemQty', 'System Qty'),
      t('inventory.physicalCount', 'Physical Count'),
      t('inventory.variance', 'Variance'),
      t('inventory.adjustment', 'Adjustment'),
      t('common.notes', 'Notes'),
      t('common.date', 'Date')
    ];

    // CSV Rows (no manual quoting needed - csvUtils handles it)
    const rows = adjustments.map(entry => [
      entry.product.name,
      entry.product.sku,
      entry.product.category,
      selectedLocationName(),
      entry.systemQuantity,
      entry.physicalCount!,
      entry.variance,
      entry.variance > 0 ? t('inventory.stockIncrease', 'Stock Increase') : t('inventory.stockDecrease', 'Stock Decrease'),
      entry.notes || t('inventory.physicalCountAdjustment', 'Physical count adjustment'),
      formatDate()
    ]);

    // Use CSV utility that properly handles commas, quotes, and special characters
    return convertToCSV(rows, headers);
  };

  // Download CSV file
  const downloadCSV = () => {
    const csvContent = generateCSVContent();
    if (!csvContent) {
      alert(t('inventory.noAdjustmentsToDownload', 'No adjustments to download'));
      return;
    }

    // Use the CSV utility for proper UTF-8 encoding with BOM
    downloadCSVFile(csvContent, `inventory-adjustments-${formatDate().replace(/[/:,\s]/g, '-')}.csv`);
  };

  // Save inventory adjustments
  const saveInventoryAdjustments = async (autoDownloadCSV: boolean = true) => {
    try {
      setSaving(true);
      
      devLog(countingEntries());


      const parseAdj = (entry: Record<string, any>):BulkMovementItem  => {
        let prod = inventoryStore.getProductById(entry.productId);

        let stock = inventoryStore.getStockByProductAndLocation(entry.productId, selectedLocation())
       
        let averageCost = parseFloat(stock?.averageCost + "")
        let quantity = parseFloat(stock?.quantity + "")

        return {
          product: {
            id: entry.productId,
            label: prod?.name,
            code: prod?.code
          },
          productId: entry?.productId,
          reason: 'Physical Count Adjustment',
          notes: entry?.notes || 'Physical inventory adjustment',
          quantity: entry?.variance,
          unitCost: averageCost
        }
      }



      const adjustments: BulkMovementItem[] = countingEntries()
        .filter(entry => entry.physicalCount !== null && entry.variance !== 0)
        .map(parseAdj);


        /*
        {
          productId: entry.productId,

          systemQuantity: entry.systemQuantity,
          physicalCount: entry.physicalCount!,
          variance: entry.variance,
          notes: entry.notes || 'Physical inventory adjustment',
          movementType: entry.variance > 0 ? 'in' : 'out',
          quantity: Math.abs(entry.variance),
          reason: 'Physical Count Adjustment'
        }
        */
        

        let invoice = "ADJ_"+ generateRandomNUM();

        const timestamp = new Date().toISOString();
   
    const bulkRequest: BulkMovementRequest = {
      ssg_inventory_key: generateRandomId(),
      invoiceId: invoice,
      referenceNumber: generateRandomNUM(),
      movementType: "adjustment",
      type: "adjustment",
      locationId: selectedLocation(),
      items: adjustments,
      products: adjustments,
      generalNotes: 'Physical inventory adjustment',
      description:  'Physical Count Adjustment',
      invoice: invoice,
      store: selectedLocation(),
      createdBy: 'admin',
      createDate: timestamp,
    };

    devLog('Saving inventory bulkRequest:', bulkRequest);


    //const result = await inventoryStore.addBulkInventoryMovements(bulkRequest);

    const prodResults = await inventoryApi.addInventory(bulkRequest);
      // Generate and download CSV before saving if requested
      if (autoDownloadCSV && adjustments.length > 0) {
        downloadCSV();
      }

      // Here you would call the API to save adjustments
      devLog('Saving inventory adjustments:', adjustments);
      
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Close the form after successful save
      props.onClose();
      
    } catch (error) {
      console.error('Failed to save inventory adjustments:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectedLocationName = createMemo(() => {
    if (selectedLocation() === 'all') return 'All Locations';
    const location = locations().find(l => l.id === selectedLocation());
    return location?.name || 'Unknown Location';
  });

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const Initialize = async () => {
    let qry = authStore.getBusinessId();
    await inventoryStore.fecthInventory(qry)
    //await inventoryStore.fecthProduct(qry)
    await loadAllProducts();
  }
  



    // Load all products when component mounts
    onMount(async () => {
      
      if (props.selectedLocationId) {
        setSelectedLocation(props.selectedLocationId);
      }
      Initialize();
    });


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
         
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${product.unitOfMeasure}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${systemQty}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; background-color: #f9f9f9;"></td>
          <td style="border: 1px solid #000; padding: 8px;"></td>
        </tr>
      `;
    }).join('');

    // Get current translations
  

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title> ${selectedLocationName()}_${selectedCategory()}_${t('inventory.countingSheet', 'Inventory Counting Sheet')} - ${formatDate()}</title>
        <style>
          @page {
            size: letter;
            margin: 0.5in 0.8in 0.5in 0.8in;
            @top-center {
              content: "${selectedLocationName()} | ${selectedCategory() === 'all' ? t('inventory.allCategories', 'All Categories') : selectedCategory()} | Page " counter(page);
              font-size: 10px;
              font-weight: bold;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 0;
            position: relative;
          }
          .page-identifier {
            position: fixed;
            left: 5px;
            top: 50%;
            transform: rotate(-90deg) translateX(-50%);
            transform-origin: left center;
            background: #f0f0f0;
            padding: 5px 15px;
            border: 1px solid #ccc;
            font-weight: bold;
            font-size: 10px;
            color: #333;
            z-index: 100;
          }
          .page-identifier-right {
            position: fixed;
            right: 5px;
            top: 50%;
            transform: rotate(90deg) translateX(50%);
            transform-origin: right center;
            background: #f0f0f0;
            padding: 5px 15px;
            border: 1px solid #ccc;
            font-weight: bold;
            font-size: 10px;
            color: #333;
            z-index: 100;
          }
          h1 {
            text-align: center;
            margin: 0 0 10px 0;
            font-size: 22px;
            page-break-after: avoid;
          }
          .header-info {
            text-align: center;
            margin-bottom: 20px;
            background: #f8f8f8;
            padding: 10px;
            border: 2px solid #333;
            page-break-after: avoid;
          }
          .page-header {
            display: none;
            text-align: center;
            background: #e0e0e0;
            padding: 8px;
            border: 1px solid #333;
            margin-bottom: 10px;
            font-weight: bold;
            font-size: 11px;
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
            /*page-break-before: auto;*/
          }
          .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            page-break-before: auto;
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
            body { margin: 0; }
            .page-identifier, .page-identifier-right { display: block; }
            .page-header { display: block; }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            .header-info { page-break-after: avoid; }
            h1 { page-break-after: avoid; }
            table { page-break-before: auto; }
            /*.summary-table { page-break-before: always; }*/
            .signature-section { page-break-before: avoid; }
            
            /* Repeat headers on each page */
            @page :first {
              @top-center { content: none; }
            }
            
            /* Force page headers to show on continuation pages */
            tbody::before {
              content: "";
              display: block;
              height: 0;
            }
          }
        </style>
      </head>
      <body>
        <!-- Page identifiers for multi-page documents -->
        <div class="page-identifier-right">
          ${selectedLocationName()} - ${selectedCategory() === 'all' ? t('inventory.allCategories', 'All Categories') : selectedCategory()} - ${formatDate()} 
        </div>
       
        
        <h1>${t('inventory.inventoryCountingSheetTitle', 'INVENTORY COUNTING SHEET')}</h1>
        <div class="header-info">
          <p><strong>${t('inventory.location', 'Location')}:</strong> ${selectedLocationName()}</p>
          <p><strong>${t('common.category', 'Category')}:</strong> ${selectedCategory() === 'all' ? t('inventory.allCategories', 'All Categories') : selectedCategory()}</p>
          <p><strong>${t('common.date', 'Date')}:</strong> ${formatDate()}</p>
          <p style="margin-top: 10px;">
            <span style="margin-right: 30px;">${t('inventory.countedBy', 'Counted by')}: _________________________</span>
            <span>${t('inventory.verifiedBy', 'Verified by')}: _________________________</span>
          </p>
        </div>

        <!-- Page header for continuation pages (hidden on first page) -->
        <div class="page-header">
          ${selectedLocationName()} | ${selectedCategory() === 'all' ? t('inventory.allCategories', 'All Categories') : selectedCategory()} | ${formatDate()} 
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">#</th>
              <th style="width: 12%;">${t('inventory.sku', 'SKU')}</th>
              <th style="width: 25%;">${t('inventory.productName', 'Product Name')}</th>
              <th style="width: 8%; text-align: center;">${t('inventory.unit', 'Unit')}</th>
              <th style="width: 10%; text-align: center;">${t('inventory.systemQty', 'System Qty')}</th>
              <th style="width: 12%; text-align: center; background-color: #f0f0f0;">${t('inventory.physicalCount', 'Physical Count')}</th>
              <th style="width: 28%;">${t('common.notes', 'Notes')}</th>
            </tr>
            <!-- Repeat header info row for clarity -->
            <tr style="background-color: #f8f8f8; font-size: 10px;">
              <td colspan="8" style="text-align: center; padding: 4px; border: 1px solid #000; font-weight: bold;">
                📍 ${selectedLocationName()} | 📂 ${selectedCategory() === 'all' ? t('inventory.allCategories', 'All Categories') : selectedCategory()} | 📅 ${formatDate()}
              </td>
            </tr>
          </thead>
          <tbody>
            ${productsHtml}
          </tbody>
        </table>
        
        <!-- Summary section with location/category context -->
        <div style="margin: 30px 0; padding: 15px; background: #f8f8f8;">
          <h3 style="text-align: center; margin: 0 0 15px 0; font-size: 16px;">
            ${t('inventory.summaryFor', 'SUMMARY FOR')}: ${selectedLocationName()} - ${selectedCategory() === 'all' ? t('inventory.allCategories', 'All Categories') : selectedCategory()}
          </h3>
          
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
        </div>
        
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
          padding: '2rem',
          width: '95%',
          height: '95%',
          'max-width': '1400px',
          'overflow-y': 'auto',
          position: 'relative'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            'margin-bottom': '2rem',
            'border-bottom': '1px solid var(--border-color)',
            'padding-bottom': '1rem'
          }}>
            <h2 style={{ margin: '0', 'font-size': '1.5rem' }}>
              📋 {t('inventory.physicalInventoryCount', 'Physical Inventory Count')}
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

          {/* Setup Phase */}
          <Show when={countingStatus() === 'setup'}>
            <div style={{
              'text-align': 'center',
              padding: '2rem',
              'max-width': '600px',
              margin: '0 auto'
            }}>
              <div style={{
                'font-size': '3rem',
                'margin-bottom': '1rem'
              }}>📊</div>
              
              <h3 style={{ 'margin-bottom': '1rem' }}>
                {t('inventory.setupPhysicalCount', 'Setup Physical Inventory Count')}
              </h3>
              
              <p style={{ 'margin-bottom': '2rem', color: 'var(--text-muted)' }}>
                {t('inventory.setupDescription', 'Configure your physical inventory count settings and begin the counting process.')}
              </p>

              {/* Configuration Controls */}
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                'margin-bottom': '2rem',
                padding: '1rem',
                background: 'var(--surface-color)',
                'border-radius': 'var(--border-radius)',
                'text-align': 'left'
              }}>
                <div>
                  <label style={{ display: 'block', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                    {t('inventory.location', 'Location')}:
                  </label>
                  <select
                    value={selectedLocation()}
                    onChange={(e) => setSelectedLocation(e.target.value)}
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
                    onChange={(e) => setSelectedCategory(e.target.value)}
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
              </div>

              <Show
                when={!loading()}
                fallback={
                  <div style={{ padding: '2rem' }}>
                    {t('common.loading', 'Loading')}...
                  </div>
                }
              >
                <div style={{
                  padding: '1rem',
                  background: '#fff3cd',
                  'border-radius': 'var(--border-radius-sm)',
                  'margin-bottom': '2rem'
                }}>
                  <p style={{ margin: '0', color: '#856404' }}>
                    📋 {t('inventory.countWillInclude', 'This count will include {{count}} products from {{location}} in {{category}} category.', {
                      count: filteredAndSortedProducts().length,
                      location: selectedLocationName(),
                      category: selectedCategory() === 'all' ? t('inventory.allCategories', 'all categories') : selectedCategory()
                    })}
                  </p>
                </div>
              {/* Progress Header */}
              <Show when={selectedCategory() !== 'all'&& selectedLocation()!== 'all'}>
                 
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
                'margin-bottom': '2rem',
                padding: '1rem',
                background: 'var(--surface-color)',
                'border-radius': 'var(--border-radius)'
              }}>
                 
                <Show when={authStore.hasPermission("physicalInventoryCountingForm")}>
                  <Button
                    variant="primary"
                    size="large"
                    onClick={initializeCounting}
                    disabled={loading() || filteredAndSortedProducts().length === 0}
                  >
                    🚀 {t('inventory.startCounting', 'Start Physical Count')}
                  </Button>
                </Show>
                <Button
                  variant="primary"
                  onClick={handlePrint}
                  disabled={loading()}
                >
                  🖨️ {t('common.print', 'Print')}
                </Button>
              
                </div>
                </Show>
              </Show>
            </div>
          </Show>

          {/* Counting Phase */}
          <Show when={countingStatus() === 'counting'}>
            <div>
              {/* Progress Header */}
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit)',
                gap: '1rem',
                'margin-bottom': '2rem',
                padding: '1rem',
                background: 'var(--surface-color)',
                'border-radius': 'var(--border-radius)'
              }}>
              {selectedLocationName()}
              </div>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
                'margin-bottom': '2rem',
                padding: '1rem',
                background: 'var(--surface-color)',
                'border-radius': 'var(--border-radius)'
              }}>
                <div style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
                    {countingSummary().countedProducts}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('inventory.counted', 'Counted')}
                  </div>
                </div>
                
                <div style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#ff9800' }}>
                    {countingSummary().remainingProducts}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('inventory.remaining', 'Remaining')}
                  </div>
                </div>

                <div style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#f44336' }}>
                    {countingSummary().variances}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('inventory.variances', 'Variances')}
                  </div>
                </div>

                <div style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: countingSummary().isComplete ? '#4caf50' : '#ff9800' }}>
                    {Math.round((countingSummary().countedProducts / countingSummary().totalProducts) * 100)}%
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('inventory.complete', 'Complete')}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                'margin-bottom': '2rem',
                'justify-content': 'center'
              }}>
                <Button
                  variant="outline"
                  onClick={() => setCountingStatus('setup')}
                >
                  ⬅️ {t('common.back', 'Back to Setup')}
                </Button>
                
                
                  <Button
                    variant="primary"
                    onClick={() => setCountingStatus('review')}
                    //disabled={!countingSummary().isComplete}
                  >
                    📋 {t('inventory.reviewAdjustments', 'Review Adjustments')}
                  </Button>
                 
              </div>

              {/* Counting Table */}
              <div style={{
                border: '1px solid var(--border-color)',
                'border-radius': 'var(--border-radius)',
                'overflow-x': 'auto'
              }}>
                <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-color)' }}>
                      <th style={{ padding: '1rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>
                          {t('inventory.no', 'No')}
                      </th>
                      <th style={{ padding: '1rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>
                        {t('inventory.product', 'Product')}
                      </th>
                      <th style={{ padding: '1rem', 'text-align': 'center', 'border-bottom': '1px solid var(--border-color)' }}>
                        {t('inventory.systemQty', 'System Qty')}
                      </th>
                      <th style={{ padding: '1rem', 'text-align': 'center', 'border-bottom': '1px solid var(--border-color)' }}>
                        {t('inventory.physicalCount', 'Physical Count')}
                      </th>
                      <th style={{ padding: '1rem', 'text-align': 'center', 'border-bottom': '1px solid var(--border-color)' }}>
                        {t('inventory.variance', 'Variance')}
                      </th>
                      <th style={{ padding: '1rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>
                        {t('common.notes', 'Notes')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={countingEntries()}>
                      {(entry, index) => (
                        <Products2Inv  
                          index={index()}
                          updatePhysicalCount={updatePhysicalCount} 
                          entry={entry} 
                          updateNotes={updateNotes} 
                        />
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </Show>

          {/* Review Phase */}
          <Show when={countingStatus() === 'review'}>
            <div>
              <div style={{
                'text-align': 'center',
                'margin-bottom': '2rem'
              }}>
                <h3 style={{ 'margin-bottom': '1rem' }}>
                  📋 {t('inventory.reviewAndConfirm', 'Review and Confirm Adjustments')}
                </h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  {t('inventory.reviewDescription', 'Review the inventory adjustments below and confirm to update your system.')}
                </p>
              </div>

              {/* Summary */}
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                'margin-bottom': '2rem',
                padding: '1rem',
                background: 'var(--surface-color)',
                'border-radius': 'var(--border-radius)'
              }}>
                <div style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#4caf50' }}>
                    {countingSummary().positiveVariances}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('inventory.stockIncreases', 'Stock Increases')}
                  </div>
                </div>
                
                <div style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: '#f44336' }}>
                    {countingSummary().negativeVariances}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('inventory.stockDecreases', 'Stock Decreases')}
                  </div>
                </div>

                <div style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '1.5rem', 'font-weight': '700', color: 'var(--primary-color)' }}>
                    {countingSummary().variances}
                  </div>
                  <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                    {t('inventory.totalAdjustments', 'Total Adjustments')}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                'margin-bottom': '2rem',
                'justify-content': 'center',
                'flex-wrap': 'wrap'
              }}>
                <Button
                  variant="outline"
                  onClick={() => setCountingStatus('counting')}
                >
                  ⬅️ {t('common.back', 'Back to Counting')}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={downloadCSV}
                  disabled={countingSummary().variances === 0}
                >
                  📥 {t('inventory.downloadCSV', 'Download CSV')}
                </Button>
                
                <Button
                  variant="primary"
                  onClick={saveInventoryAdjustments}
                  disabled={saving() || countingSummary().variances === 0}
                >
                  {saving() ? '💾 ' + t('common.saving', 'Saving') + '...' : '✅ ' + t('inventory.confirmAdjustments', 'Confirm Adjustments')}
                </Button>
              </div>

              {/* Adjustments Table */}
              <Show when={countingSummary().variances > 0}>
                <div style={{
                  border: '1px solid var(--border-color)',
                  'border-radius': 'var(--border-radius)',
                  'overflow-x': 'auto'
                }}>
                  <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-color)' }}>
                       
                        <th style={{ padding: '1rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>
                          {t('inventory.product', 'Product')}
                        </th>
                        <th style={{ padding: '1rem', 'text-align': 'center', 'border-bottom': '1px solid var(--border-color)' }}>
                          {t('inventory.systemQty', 'System Qty')}
                        </th>
                        <th style={{ padding: '1rem', 'text-align': 'center', 'border-bottom': '1px solid var(--border-color)' }}>
                          {t('inventory.physicalCount', 'Physical Count')}
                        </th>
                        <th style={{ padding: '1rem', 'text-align': 'center', 'border-bottom': '1px solid var(--border-color)' }}>
                          {t('inventory.adjustment', 'Adjustment')}
                        </th>
                        <th style={{ padding: '1rem', 'text-align': 'left', 'border-bottom': '1px solid var(--border-color)' }}>
                          {t('common.notes', 'Notes')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={countingEntries().filter(entry => entry.variance !== 0)}>
                        {(entry) => (
                          <tr style={{ 
                            'border-bottom': '1px solid var(--border-color)',
                            background: entry.variance > 0 ? '#d4edda' : '#f8d7da'
                          }}>
                           
                            <td style={{ padding: '1rem' }}>
                              <div style={{ 'font-weight': '500' }}>{entry.product.name}</div>
                              <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
                                {entry.product.sku} • {entry.product.category}
                              </div>
                            </td>
                            
                            <td style={{ padding: '1rem', 'text-align': 'center' }}>
                              <div style={{ 'font-weight': '600' }}>{entry.systemQuantity}</div>
                            </td>
                            
                            <td style={{ padding: '1rem', 'text-align': 'center' }}>
                              <div style={{ 'font-weight': '600' }}>{entry.physicalCount}</div>
                            </td>
                            
                            <td style={{ padding: '1rem', 'text-align': 'center' }}>
                              <div style={{ 
                                'font-weight': '700',
                                color: entry.variance > 0 ? '#4caf50' : '#f44336'
                              }}>
                                {entry.variance > 0 ? '+' : ''}{entry.variance}
                              </div>
                            </td>
                            
                            <td style={{ padding: '1rem' }}>
                              <div style={{ 'font-size': '0.875rem' }}>
                                {entry.notes || t('inventory.physicalCountAdjustment', 'Physical count adjustment')}
                              </div>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>

              <Show when={countingSummary().variances === 0}>
                <div style={{
                  'text-align': 'center',
                  padding: '3rem',
                  background: 'var(--surface-color)',
                  'border-radius': 'var(--border-radius)'
                }}>
                  <div style={{ 'font-size': '3rem', 'margin-bottom': '1rem' }}>✅</div>
                  <h3 style={{ 'margin-bottom': '0.5rem' }}>
                    {t('inventory.perfectCount', 'Perfect Count!')}
                  </h3>
                  <p style={{ color: 'var(--text-muted)' }}>
                    {t('inventory.noVariances', 'No variances found. Your physical count matches the system exactly.')}
                  </p>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default PhysicalInventoryCountingForm;




interface Products2InvProps {
  updateNotes: (productId: string, notes: string) => void;
  updatePhysicalCount: (productId: string, count: number | null  ) => void;
  entry?: Record<string, any>;
  index: number
}

const Products2Inv: Component<Products2InvProps> = (props) => {
  const { t } = useTranslation();
  const [qty, setQty] = createSignal("");
  const [note, setNote] = createSignal("");
  let {entry, updatePhysicalCount, updateNotes, index} = props;

  onMount(()=>{
    setNote(entry?.notes)
    setQty(entry?.physicalCount)
  })


  const updQty = () => {
     let inQt = document.getElementById(`physicalCountInput_${index+2}`);
     devLog(isNotEmpty(qty()) , !inQt )
    if(isNotEmpty(qty()) && !inQt){
      updatePhysicalCount(entry?.productId, qty() === '' ? null : parseFloat(qty()));
      return
    }

    if(isNotEmpty(qty()) && inQt){
      inQt.focus();
      updatePhysicalCount(entry?.productId, qty() === '' ? null : parseFloat(qty()));
      return
    }

    
  }

  return (
    <tr style={{ 
      'border-bottom': '1px solid var(--border-color)',
      background: entry?.physicalCount !== null ? (entry?.variance !== 0 ? '#fff3cd' : '#d4edda') : 'transparent'
    }}>
      <td style={{ padding: '1rem', 'text-align': 'center' }}>
        <div style={{ 'font-weight': '600' }}>{index+1}</div>
      </td>
      <td style={{ padding: '1rem' }}>
        <div style={{ 'font-weight': '500' }}>{entry?.product.name}</div>
        <div style={{ 'font-size': '0.875rem', color: 'var(--text-muted)' }}>
          {entry?.product.sku} • {entry?.product.category} • {entry?.product.unitOfMeasure}
        </div>
      </td>
      
      <td style={{ padding: '1rem', 'text-align': 'center' }}>
        <div style={{ 'font-weight': '600' }}>{entry?.systemQuantity}</div>
      </td>
      
      <td style={{ padding: '1rem', 'text-align': 'center' }}>
        <input
          type="number"
          id={`physicalCountInput_${index+1}`}
          tabIndex={index}
          value={qty() || ''}
          onInput={(e) => {
            const value = e.target.value;
            setQty(value)
          }}
          onKeyDown={(v)=>{
            if(v.keyCode===13){
              updQty();
            }
            if(v.keyCode===27){
              updQty();
            }
            if(v.keyCode===9){
             // updQty();
            }
          }}
          onBlur={()=>{
            updQty();
          }}
          style={{
            width: '100px',
            padding: '0.5rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius-sm)',
            'text-align': 'center'
          }}
          placeholder="0"
          min="0"
          step="0.01"
        />
      </td>
      
      <td style={{ padding: '1rem', 'text-align': 'center' }}>
        <div style={{ 
          'font-weight': '600',
          color: entry?.variance > 0 ? '#4caf50' : entry?.variance < 0 ? '#f44336' : 'var(--text-muted)'
        }}>
          {entry?.variance > 0 ? '+' : ''}{entry?.variance || '—'}
        </div>
      </td>
      
      <td style={{ padding: '1rem' }}>
        <input
          type="text"
          value={note() || ""}
          onInput={(e) => {
            const value = e.target.value;
            setNote(value)
          }}
          onKeyDown={(v)=>{
            if(v.keyCode===13){
              updateNotes(entry?.productId, note());
            }
            if(v.keyCode===27){
              updateNotes(entry?.productId, note());
            }
            if(v.keyCode===9){
              updateNotes(entry?.productId, note());
            }
          }}
          onBlur={(v)=>{
            updateNotes(entry?.productId, note());
          }}
          style={{
            width: '200px',
            padding: '0.5rem',
            border: '1px solid var(--border-color)',
            'border-radius': 'var(--border-radius-sm)'
          }}
          placeholder={t('inventory.addNotes', 'Add notes...')}
        />
      </td>
    </tr>
  )
}



//  "",
//  "",
//  "",




// 5026813672
// mederorisquetm@gmail.com

/// 7331 Global Drive, Louisville, KY 40258

//  5106 Railroad Ave, Louisville, KY 40258





// ayudame a hacer un poder para un menor de edad viajar con su madre autorizado por su padre