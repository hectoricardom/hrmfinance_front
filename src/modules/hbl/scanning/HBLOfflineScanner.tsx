/**
 * HBL Offline Scanner Component
 * Mobile scanner with offline-first approach
 * Stores scans locally and syncs when online
 */

import { Component, createSignal, Show, For, onMount, onCleanup, createMemo, createEffect } from 'solid-js';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { parseHBLNumbers, getHBLFormat } from '../data/hblParser';
import { statusAllList, getStatusById } from '../status/hblUpdateService';
import { authStore } from '../../../stores/authStore';
import {
  initOfflineHblService,
  updateHBLStatusOffline,
  isOnline,
  isSyncing,
  pendingCount,
  forceSyncNow,
  getPendingScansList,
  PendingScan,
  cacheUserProfile,
  getCachedUserProfile,
  downloadHBLsForOffline,
  downloadHBLsBySearch,
  getOfflineHBL,
  getCachedHBLCount,
  getAllCachedHBLs,
  clearCachedHBLs,
  cacheStatusList,
  downloadProgress,
  isDownloading
} from '../offline';
import { inventoryApi } from '../../../services/apiAdapter';
import { getAddressPSS } from '../services/manifestService';
import { devLog } from '../../../services/utils';

interface ScannedItem {
  id: string;
  hbl: string;
  statusId: string;
  statusLabel: string;
  format: 'standard' | 'extended' | 'unknown';
  scannedAt: Date;
  saved: boolean;
  offline: boolean;
  error?: string;
}

interface HBLOfflineScannerProps {
  defaultStatusId?: string;
  onScanComplete?: (item: ScannedItem) => void;
}

// Manifest generation interfaces - Hierarchical delivery structure
// Hierarchy: State → City → Rpto → Street → CID → BagNumber
interface ManifestHBLItem {
  hbl: string;
  consigneeName: string;
  phone: string;
  quantity: string;
  weight: string;
  statusLabel: string;
  scannedAt: string;
  streetNo?: string;
  between?: string;
  apt?: string;
}

interface ManifestBagGroup {
  bagnumber: string;
  items: ManifestHBLItem[];
  totalPackages: number;
}

interface ManifestCIDGroup {
  cid: string;
  consigneeName: string;
  bags: ManifestBagGroup[];
  items: ManifestHBLItem[]; // Items without bag number
  totalPackages: number;
}

interface ManifestStreetGroup {
  street: string;
  streetNo?: string;
  between?: string;
  customers: ManifestCIDGroup[];
  totalPackages: number;
}

interface ManifestRptoGroup {
  rpto: string;
  streets: ManifestStreetGroup[];
  totalPackages: number;
}

interface ManifestCityGroup {
  city: string;
  rptos: ManifestRptoGroup[];
  totalPackages: number;
}

interface ManifestStateGroup {
  state: string;
  cities: ManifestCityGroup[];
  totalPackages: number;
}

interface ManifestData {
  id: string;
  date: string;
  generatedAt: string;
  totalPackages: number;
  hierarchy: ManifestStateGroup[];
  flatItems: ManifestHBLItem[]; // All items flat for simple view
  notes: string;
}

const HBLOfflineScanner: Component<HBLOfflineScannerProps> = (props) => {
  // Scanner states
  const [selectedStatusId, setSelectedStatusId] = createSignal(props.defaultStatusId || '');
  const [isUpdating, setIsUpdating] = createSignal(false);
  const [scannedItems, setScannedItems] = createSignal<ScannedItem[]>([]);
  const [lastScannedHBL, setLastScannedHBL] = createSignal<string>('');
  const [isScanning, setIsScanning] = createSignal(false);
  const [hasPermission, setHasPermission] = createSignal<boolean | null>(null);
  const [error, setError] = createSignal<string>('');
  const [activeTab, setActiveTab] = createSignal<'camera' | 'textarea' | 'pending' | 'download' | 'manifest'>('pending');
  const [textareaInput, setTextareaInput] = createSignal('');
  const [pendingScans, setPendingScans] = createSignal<PendingScan[]>([]);
  const [syncResult, setSyncResult] = createSignal<{ synced: number; failed: number } | null>(null);

  // Manifest states
  const [selectedForManifest, setSelectedForManifest] = createSignal<Set<string>>(new Set());
  const [manifestNotes, setManifestNotes] = createSignal('');
  const [generatedManifest, setGeneratedManifest] = createSignal<ManifestData | null>(null);
  const [showManifestPreview, setShowManifestPreview] = createSignal(false);

  // Download states
  const [downloadInput, setDownloadInput] = createSignal('');
  const [searchInput, setSearchInput] = createSignal('');
  const [cachedCount, setCachedCount] = createSignal(0);
  const [downloadResult, setDownloadResult] = createSignal<{ success: number; failed: number } | null>(null);
  const [cachedUser, setCachedUser] = createSignal<any>(null);

  // Scanner refs
  let videoRef: HTMLVideoElement | undefined;
  let codeReader: BrowserMultiFormatReader | undefined;
  let stream: MediaStream | undefined;

  // Stats
  const successCount = createMemo(() => scannedItems().filter(i => i.saved).length);
  const offlineCount = createMemo(() => scannedItems().filter(i => i.offline).length);
  const errorCount = createMemo(() => scannedItems().filter(i => i.error).length);

  // Filter status locations based on user permissions
  const allowedStatusLocations = createMemo(() => {
    const profile = authStore.state?.profile;

    // Admin sees all
    if (profile?.isAdmin || profile?.permissions?.isAdmin) {
      return statusAllList;
    }

    // Use authStore's filter function if available
    if (authStore.filterAllowedStatusLocations) {
      const filtered = authStore.filterAllowedStatusLocations(statusAllList);
      devLog('Filtered status locations:', filtered.length, 'of', statusAllList.length);
      return filtered;
    }

    // Fallback: filter manually based on statusLocationPermissions
    const statusPerms = profile?.statusLocationPermissions || profile?.permissions?.statusLocationPermissions;
    if (statusPerms) {
      return statusAllList.filter(status => statusPerms[status.id] === true);
    }

    // No permissions found - return empty for non-admins
    devLog('No status location permissions found for user');
    return [];
  });

  let lastProcessedCode = '';
  let processingTimeout: any = null;

  // Initialize
  onMount(async () => {
    // Initialize offline service
    await initOfflineHblService();

    // Load pending scans
    await loadPendingScans();

    // Cache user profile and status list for offline use
    await cacheUserProfile();
    // Cache only the allowed status locations for this user
    const userAllowedLocations = allowedStatusLocations();
    await cacheStatusList(userAllowedLocations.length > 0 ? userAllowedLocations : statusAllList);

    // Load cached counts
    await loadCachedData();

    // Add CSS animation
    const style = document.createElement('style');
    style.id = 'hbl-offline-scanner-styles';
    style.textContent = `
      @keyframes scan {
        0% { top: 0; }
        100% { top: 100%; }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    if (!document.getElementById('hbl-offline-scanner-styles')) {
      document.head.appendChild(style);
    }

    try {
     codeReader = new BrowserMultiFormatReader();
     await requestCameraPermission();
    } catch (err: any) {
      devLog('Failed to initialize scanner:', err);
      setError(`Failed to initialize: ${err.message || err}`);
    }
  });

  // Cleanup
  onCleanup(() => {
    stopScanning();
    if (processingTimeout) {
      clearTimeout(processingTimeout);
    }
  });

  // Load pending scans from IndexedDB
  const loadPendingScans = async () => {
    try {
      const scans = await getPendingScansList();
      setPendingScans(scans);
    } catch (err) {
      devLog('Error loading pending scans:', err);
    }
  };

  // Load cached data (count, user profile)
  const loadCachedData = async () => {
    try {
      const count = await getCachedHBLCount();
      setCachedCount(count);

      const user = await getCachedUserProfile();
      setCachedUser(user);
    } catch (err) {
      devLog('Error loading cached data:', err);
    }
  };

  // Download HBLs by list
  const handleDownloadByList = async () => {
    const input = downloadInput().trim();
    if (!input) return;

    const hblNumbers = parseHBLNumbers(input);
    if (hblNumbers.length === 0) {
      setError('No se encontraron HBLs validos');
      return;
    }

    setError('');
    setDownloadResult(null);

    const result = await downloadHBLsForOffline(hblNumbers);
    setDownloadResult({ success: result.success, failed: result.failed });
    await loadCachedData();

    // Clear input on success
    if (result.success > 0) {
      setDownloadInput('');
    }
  };

  // Download HBLs by search
  const handleDownloadBySearch = async () => {
    const search = searchInput().trim();
    if (!search) return;

    setError('');
    setDownloadResult(null);

    const result = await downloadHBLsBySearch(search);
    setDownloadResult(result);
    await loadCachedData();

    if (result.success > 0) {
      setSearchInput('');
    }
  };

  // Clear cached HBLs
  const handleClearCache = async () => {
    if (confirm('¿Eliminar todos los HBLs descargados?')) {
      await clearCachedHBLs();
      await loadCachedData();
    }
  };

  // Manifest functions
  const toggleManifestSelection = (hbl: string) => {
    setSelectedForManifest(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hbl)) {
        newSet.delete(hbl);
      } else {
        newSet.add(hbl);
      }
      return newSet;
    });
  };

  const selectAllForManifest = () => {
    const allHbls = pendingScans().map(s => s.hbl);
    setSelectedForManifest(new Set(allHbls));
  };

  const deselectAllForManifest = () => {
    setSelectedForManifest(new Set());
  };

  const generateManifest = async () => {
    const selected = selectedForManifest();
    if (selected.size === 0) {
      setError('Selecciona al menos un HBL para el manifiesto');
      return;
    }

    const selectedScans = pendingScans().filter(s => selected.has(s.hbl));

    // Build hierarchical structure: State → City → Street → CID → BagNumber
    const stateMap: Record<string, ManifestStateGroup> = {};
    const flatItems: ManifestHBLItem[] = [];

    for (const scan of selectedScans) {
      // Look up HBL data from offline cache
      const cachedHBL = await getOfflineHBL(scan.hbl);
      const hblData = cachedHBL?.data || cachedHBL || {};

      // Parse address from street field if address object is missing or incomplete
      let parsedAddress = hblData?.address || {};
      if ((!parsedAddress?.estate || !parsedAddress?.city) && hblData?.street) {
        try {
          parsedAddress = getAddressPSS(hblData.street);
        } catch (e) {
          devLog('Failed to parse street:', hblData.street);
        }
      }

      // Extract address info using parsed or existing address
      const state = parsedAddress?.estate || hblData?.estate || 'Sin Estado';
      const city = parsedAddress?.city || hblData?.city || 'Sin Ciudad';
      const rpto = parsedAddress?.Rpto || parsedAddress?.rpto || '';
      const streetName = parsedAddress?.streetName || hblData?.street || 'Sin Calle';
      const streetNo = parsedAddress?.streetNo || '';
      const between = parsedAddress?.betwen || parsedAddress?.between || '';
      const apt = parsedAddress?.apt || '';
      const cid = hblData?.cidentity || hblData?.cid || 'Sin CID';
      const bagnumber = hblData?.bagnumber || hblData?.bagNumber || hblData?.bag_number || hblData?.bagNo || hblData?.bag || '';
      const consigneeName = hblData?.consigneeName || hblData?.nameshipper || 'Desconocido';

      // Debug log to see what fields are available
      if (!bagnumber) {
        devLog('HBL data keys:', Object.keys(hblData || {}));
      }
      const phone = hblData?.ctelephone || hblData?.phoneshipper || '';
      const quantity = hblData?.quantity || '1';
      const weight = hblData?.weight || '0';

      const item: ManifestHBLItem = {
        hbl: scan.hbl,
        consigneeName,
        phone,
        quantity,
        weight,
        statusLabel: scan.statusLabel,
        scannedAt: new Date(scan.scannedAt).toLocaleString(),
        streetNo,
        between,
        apt
      };
      flatItems.push(item);

      // Build hierarchy: State → City → Rpto → Street → CID → BagNumber
      if (!stateMap[state]) {
        stateMap[state] = { state, cities: [], totalPackages: 0 };
      }
      const stateGroup = stateMap[state];
      stateGroup.totalPackages++;

      let cityGroup = stateGroup.cities.find(c => c.city === city);
      if (!cityGroup) {
        cityGroup = { city, rptos: [], totalPackages: 0 };
        stateGroup.cities.push(cityGroup);
      }
      cityGroup.totalPackages++;

      // Add Rpto level
      const rptoKey = rpto || 'Sin Reparto';
      let rptoGroup = cityGroup.rptos.find(r => r.rpto === rptoKey);
      if (!rptoGroup) {
        rptoGroup = { rpto: rptoKey, streets: [], totalPackages: 0 };
        cityGroup.rptos.push(rptoGroup);
      }
      rptoGroup.totalPackages++;

      let streetGroup = rptoGroup.streets.find(s => s.street === streetName);
      if (!streetGroup) {
        streetGroup = { street: streetName, streetNo, between, customers: [], totalPackages: 0 };
        rptoGroup.streets.push(streetGroup);
      }
      streetGroup.totalPackages++;

      let cidGroup = streetGroup.customers.find(c => c.cid === cid);
      if (!cidGroup) {
        cidGroup = { cid, consigneeName, bags: [], items: [], totalPackages: 0 };
        streetGroup.customers.push(cidGroup);
      }
      cidGroup.totalPackages++;

      if (bagnumber) {
        let bagGroup = cidGroup.bags.find(b => b.bagnumber === bagnumber);
        if (!bagGroup) {
          bagGroup = { bagnumber, items: [], totalPackages: 0 };
          cidGroup.bags.push(bagGroup);
        }
        bagGroup.items.push(item);
        bagGroup.totalPackages++;
      } else {
        cidGroup.items.push(item);
      }
    }

    // Convert map to array and sort
    const hierarchy = Object.values(stateMap).sort((a, b) => a.state.localeCompare(b.state));
    hierarchy.forEach(state => {
      state.cities.sort((a, b) => a.city.localeCompare(b.city));
      state.cities.forEach(city => {
        city.rptos.sort((a, b) => a.rpto.localeCompare(b.rpto));
        city.rptos.forEach(rpto => {
          rpto.streets.sort((a, b) => a.street.localeCompare(b.street));
          rpto.streets.forEach(street => {
            street.customers.sort((a, b) => a.consigneeName.localeCompare(b.consigneeName));
          });
        });
      });
    });

    const manifest: ManifestData = {
      id: `MF-${Date.now().toString(36).toUpperCase()}`,
      date: new Date().toLocaleDateString(),
      generatedAt: new Date().toLocaleString(),
      totalPackages: flatItems.length,
      hierarchy,
      flatItems,
      notes: manifestNotes()
    };

    setGeneratedManifest(manifest);
    setShowManifestPreview(true);
    setError('');
  };

  const printManifest = () => {
    const manifest = generatedManifest();
    if (!manifest) return;

    const user = cachedUser() || authStore.state?.profile;
    const userName = user?.displayName || user?.email || 'Usuario';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('No se pudo abrir la ventana de impresion. Verifica los permisos del navegador.');
      return;
    }

    // Build hierarchical HTML: State → City → Rpto → Street → CID → Bag
    const buildHierarchyHTML = () => {
      let html = '';
      let customerCounter = 0;

      manifest.hierarchy.forEach(stateGroup => {
        html += `<div class="state-row">${stateGroup.state} (${stateGroup.totalPackages})</div>`;

        stateGroup.cities.forEach(cityGroup => {
          html += `<div class="city-row">${cityGroup.city} (${cityGroup.totalPackages})</div>`;

          cityGroup.rptos.forEach(rptoGroup => {
            html += `<div class="rpto-row">${rptoGroup.rpto} (${rptoGroup.totalPackages})</div>`;

            rptoGroup.streets.forEach(streetGroup => {
              const streetInfo = [streetGroup.street, streetGroup.streetNo, streetGroup.between].filter(Boolean).join(' ');
              html += `<div class="street-row">${streetInfo} (${streetGroup.totalPackages})</div>`;

              html += `<table class="items-table"><thead><tr><th>#</th><th>Cliente</th><th>Bolsa</th><th>HBLs</th><th>Cant</th><th>Peso</th><th>Firma</th></tr></thead><tbody>`;

              streetGroup.customers.forEach(customer => {
                customerCounter++;
                // Get phone from first item
                const phone = customer.bags[0]?.items[0]?.phone || customer.items[0]?.phone || '';
                const customerInfo = `${customer.cid} - ${customer.consigneeName}${phone ? ` | ${phone}` : ''}`;

                // Group by bags - join HBLs and sum weights
                if (customer.bags.length > 0) {
                  customer.bags.forEach((bag, bagIdx) => {
                    const hbls = bag.items.map(i => i.hbl).join(', ');
                    const totalWeight = bag.items.reduce((sum, i) => sum + parseFloat(i.weight || '0'), 0);
                    const count = bag.items.length;

                    html += `<tr>
                      <td>${customerCounter}${customer.bags.length > 1 ? String.fromCharCode(97 + bagIdx) : ''}</td>
                      <td>${bagIdx === 0 ? customerInfo : ''}</td>
                      <td><b>${bag.bagnumber}</b></td>
                      <td class="hbl">${hbls}</td>
                      <td>${count}</td>
                      <td>${totalWeight.toFixed(1)}kg</td>
                      <td class="sig-cell"></td>
                    </tr>`;
                  });
                }

                // Items without bag - join all
                if (customer.items.length > 0) {
                  const hbls = customer.items.map(i => i.hbl).join(', ');
                  const totalWeight = customer.items.reduce((sum, i) => sum + parseFloat(i.weight || '0'), 0);
                  const count = customer.items.length;
                  const showCustomer = customer.bags.length === 0;

                  html += `<tr>
                    <td>${customerCounter}${customer.bags.length > 0 ? String.fromCharCode(97 + customer.bags.length) : ''}</td>
                    <td>${showCustomer ? customerInfo : ''}</td>
                    <td>-</td>
                    <td class="hbl">${hbls}</td>
                    <td>${count}</td>
                    <td>${totalWeight.toFixed(1)}kg</td>
                    <td class="sig-cell"></td>
                  </tr>`;
                }
              });

              html += `</tbody></table>`;
            });
          });
        });
      });

      return html;
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manifiesto ${manifest.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 8px; font-size: 9px; color: #000; line-height: 1.2; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
          .header h1 { font-size: 14px; font-weight: bold; }
          .header-info { text-align: right; font-size: 8px; }
          .header-info span { display: block; }
          .header-info .total { font-size: 11px; font-weight: bold; }
          .state-row { background: #000; color: #fff; padding: 3px 6px; font-weight: bold; font-size: 10px; margin-top: 8px; }
          .city-row { background: #444; color: #fff; padding: 2px 6px; font-size: 9px; margin-top: 3px; }
          .rpto-row { background: #666; color: #fff; padding: 2px 6px; font-size: 8px; margin-top: 2px; }
          .street-row { background: #ddd; padding: 2px 6px; font-size: 8px; font-weight: bold; margin-top: 2px; border-left: 3px solid #000; }
          .items-table { width: 100%; border-collapse: collapse; font-size: 8px; border: 1px solid #000; margin-top: 2px; margin-bottom: 6px; }
          .items-table th { background: #ddd; padding: 3px 4px; text-align: left; font-weight: bold; border: 1px solid #000; }
          .items-table td { padding: 3px 4px; border: 1px solid #ccc; vertical-align: top; }
          .items-table .hbl { font-family: monospace; font-size: 7px; word-break: break-all; max-width: 180px; }
          .items-table .sig-cell { width: 50px; min-width: 50px; }
          .notes { margin-top: 6px; padding: 4px; border: 1px solid #000; font-size: 8px; }
          .footer { margin-top: 12px; display: flex; justify-content: space-between; font-size: 8px; border-top: 2px solid #000; padding-top: 8px; }
          .sig-line { border-top: 1px solid #000; width: 140px; margin-top: 20px; padding-top: 2px; text-align: center; }
          @media print { body { padding: 5px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MANIFIESTO ${manifest.id}</h1>
          <div class="header-info">
            <span>${manifest.date} | ${manifest.generatedAt}</span>
            <span class="total">${manifest.totalPackages} paquetes</span>
            <span>${userName}</span>
          </div>
        </div>

        ${buildHierarchyHTML()}

        ${manifest.notes ? `<div class="notes"><b>Notas:</b> ${manifest.notes}</div>` : ''}

        <div class="footer">
          <div class="sig-line">Entregado por</div>
          <div class="sig-line">Recibido por</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const downloadManifestAsText = () => {
    const manifest = generatedManifest();
    if (!manifest) return;

    const user = cachedUser() || authStore.state?.profile;
    const userName = user?.displayName || user?.email || 'Usuario';

    let content = `MANIFIESTO DE ENTREGA\n`;
    content += `${'='.repeat(70)}\n`;
    content += `ID: ${manifest.id}  |  Fecha: ${manifest.date}  |  Total: ${manifest.totalPackages} paq\n`;
    content += `Generado: ${manifest.generatedAt}  |  Por: ${userName}\n`;
    content += `${'='.repeat(70)}\n`;

    let customerCounter = 0;

    manifest.hierarchy.forEach(stateGroup => {
      content += `\n${'#'.repeat(70)}\n`;
      content += `ESTADO: ${stateGroup.state} (${stateGroup.totalPackages})\n`;
      content += `${'#'.repeat(70)}\n`;

      stateGroup.cities.forEach(cityGroup => {
        content += `\nCIUDAD: ${cityGroup.city} (${cityGroup.totalPackages})\n`;

        cityGroup.rptos.forEach((rptoGroup, rptoIdx) => {
          // Add extra space before each reparto for visibility
          if (rptoIdx > 0) content += `\n`;
          content += `\n  REPARTO: ${rptoGroup.rpto} (${rptoGroup.totalPackages})\n`;
          content += `  ${'-'.repeat(65)}\n`;

          rptoGroup.streets.forEach(streetGroup => {
            const streetInfo = [streetGroup.street, streetGroup.streetNo, streetGroup.between].filter(Boolean).join(' ');
            content += `\n    CALLE: ${streetInfo} (${streetGroup.totalPackages})\n`;

            streetGroup.customers.forEach(customer => {
              customerCounter++;
              // Get phone from first item
              const phone = customer.bags[0]?.items[0]?.phone || customer.items[0]?.phone || '';

              content += `\n    ${customerCounter}. [${customer.cid}] ${customer.consigneeName}${phone ? ` | Tel: ${phone}` : ''}\n`;

              // Bags - join HBLs and sum weights
              customer.bags.forEach((bag, bagIdx) => {
                const hbls = bag.items.map(i => i.hbl).join(', ');
                const totalWeight = bag.items.reduce((sum, i) => sum + parseFloat(i.weight || '0'), 0);
                const count = bag.items.length;

                content += `       * Bolsa ${bag.bagnumber}: ${count} paq, ${totalWeight.toFixed(1)}kg`.padEnd(50) + `Firma: ________\n`;
                content += `          HBLs: ${hbls}\n`;
              });

              // Items without bag - join all
              if (customer.items.length > 0) {
                const hbls = customer.items.map(i => i.hbl).join(', ');
                const totalWeight = customer.items.reduce((sum, i) => sum + parseFloat(i.weight || '0'), 0);
                const count = customer.items.length;

                content += `       * Sin Bolsa: ${count} paq, ${totalWeight.toFixed(1)}kg`.padEnd(50) + `Firma: ________\n`;
                content += `         HBLs: ${hbls}\n`;
              }
            });
          });
        });
      });
    });

    if (manifest.notes) {
      content += `\n${'-'.repeat(70)}\n`;
      content += `NOTAS: ${manifest.notes}\n`;
    }

    content += `\n${'='.repeat(70)}\n`;
    content += `Entregado por: ________________________  Firma: ______________\n`;
    content += `Recibido por:  ________________________  Firma: ______________\n`;
    content += `${'='.repeat(70)}\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manifiesto-${manifest.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const closeManifestPreview = () => {
    setShowManifestPreview(false);
  };

  // Refresh pending scans when syncing completes
  createEffect(() => {
    if (!isSyncing()) {
      loadPendingScans();
    }
  });

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setHasPermission(true);
      mediaStream.getTracks().forEach(track => track.stop());

      if (selectedStatusId()) {
        startScanning();
      }
    } catch (err: any) {
      devLog('Camera permission error:', err);
      setHasPermission(false);
      setError(`Camera error: ${err.message || 'Permission required'}`);
    }
  };

  // Start scanning
  const startScanning = async () => {
    if (!codeReader || !videoRef) {
      setError('Scanner not initialized');
      return;
    }

    try {
      setIsScanning(true);
      setError('');

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      await codeReader.decodeFromConstraints(
        constraints,
        videoRef,
        (result, error) => {
          if (result) {
            handleScanResult(result.getText());
          }
          if (error && !(error instanceof NotFoundException)) {
            devLog('Scanning error:', error);
          }
        }
      );

      if (videoRef.srcObject) {
        stream = videoRef.srcObject as MediaStream;
      }
    } catch (err: any) {
      devLog('Failed to start scanning:', err);
      setError(`Failed to start camera: ${err.message || err}`);
      setIsScanning(false);
    }
  };

  // Stop scanning
  const stopScanning = () => {
    try {
      codeReader?.reset();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = undefined;
      }
      if (videoRef) {
        videoRef.srcObject = null;
      }
      setIsScanning(false);
    } catch (err) {
      devLog('Error stopping scanner:', err);
    }
  };

  // Toggle scanning
  const toggleScanning = () => {
    if (isScanning()) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  // Handle scan result from camera
  const handleScanResult = async (scannedCode: string) => {
    if (scannedCode === lastProcessedCode || isUpdating()) {
      return;
    }

    lastProcessedCode = scannedCode;

    if (processingTimeout) {
      clearTimeout(processingTimeout);
    }

    processingTimeout = setTimeout(() => {
      lastProcessedCode = '';
    }, 2000);

    const parsedHBLs = parseHBLNumbers(scannedCode);

    if (parsedHBLs.length === 0) {
      addScannedItem({
        hbl: scannedCode,
        error: 'Formato HBL inválido',
        saved: false,
        offline: false
      });
      return;
    }

    const validHBL = parsedHBLs[0];
    await processHBL(validHBL);
  };



  const handleUpdateStatuses = async () => {
    
  


    try {
      let result:any = {}
      /* 
      const result = await parseAndUpdateHBLs(
        inputText(),
        selectedStatus(),
        notes() || undefined,
        selectedUser() || undefined
      );
      */
      /// 


     let hblList =  parsedHBLs().map(g =>  {

      
        let params = {
            hbl: g,
            status: selectedStatus(),
            userId: selectedUser()?.userId,
            userName: selectedUser()?.email,
            timeStamp: (new Date()).getTime()
        }
        //devLog(params);
        return params;
      })

      
      const locationResult = await inventoryApi.upsertMultiScannedLocations({list: hblList});

      //devLog(locationResult)

      //setResponse(result);

     
    } catch (error) {
      devLog('Error updating HBL statuses:', error);
      //alert(t('hbl.bulkUpdate.error', 'Error updating HBL statuses. Please try again.'));
    } finally {
      //setLoading(false);
    }
  };



  // Process a single HBL (from camera or textarea)
  const processHBL = async (hbl: string) => {
    if (!selectedStatusId()) {
      addScannedItem({
        hbl,
        error: 'No status selected',
        saved: false,
        offline: false
      });
      return;
    }

    setIsUpdating(true);
    setLastScannedHBL(hbl);

    const status = getStatusById(selectedStatusId());
    const statusLabel = status?.label || selectedStatusId();
    const hblFormat = getHBLFormat(hbl);
    const scannedBy = authStore.currentUser?.name || authStore.currentUser?.email || 'Unknown';

    try {
      const result = await updateHBLStatusOffline(
        hbl,
        selectedStatusId(),
        `${new Date().toLocaleString()}`,
        scannedBy
      );

      devLog( hbl,
        selectedStatusId(),
        `${new Date().toLocaleString()}`,
        scannedBy
      ) 

      devLog({result}) 
      const item: ScannedItem = {
        id: result.pendingId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        hbl,
        statusId: selectedStatusId(),
        statusLabel,
        format: hblFormat,
        scannedAt: new Date(),
        saved: result.success,
        offline: result.offline || false,
        error: result.success ? undefined : result.error
      };

      addScannedItem(item);

      // Vibrate on success
      if (result.success && 'vibrate' in navigator) {
        navigator.vibrate(result.offline ? [100, 50, 100] : 200);
      }

      if (props.onScanComplete) {
        props.onScanComplete(item);
      }

      // Refresh pending scans
      await loadPendingScans();
    } catch (err: any) {
      addScannedItem({
        hbl,
        error: err.message || 'Unknown error',
        saved: false,
        offline: false
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Add scanned item to list
  const addScannedItem = (item: Partial<ScannedItem>) => {
    const fullItem: ScannedItem = {
      id: item.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      hbl: item.hbl || '',
      statusId: item.statusId || selectedStatusId(),
      statusLabel: item.statusLabel || getStatusById(selectedStatusId())?.label || '',
      format: item.format || getHBLFormat(item.hbl || '') as any,
      scannedAt: item.scannedAt || new Date(),
      saved: item.saved || false,
      offline: item.offline || false,
      error: item.error
    };

    setScannedItems(prev => [fullItem, ...prev].slice(0, 100));
  };

  // Process textarea input
  const handleTextareaSubmit = async () => {
    const input = textareaInput().trim();
    if (!input) return;

    const parsedHBLs = parseHBLNumbers(input);

    if (parsedHBLs.length === 0) {
      setError('No se encontraron HBLs válidos');
      return;
    }

    setError('');

    for (const hbl of parsedHBLs) {
      await processHBL(hbl);
    }

    setTextareaInput('');
  };

  // Sync all pending scans
  const handleSync = async () => {
    setSyncResult(null);
    const result = await forceSyncNow();
    setSyncResult({ synced: result.synced, failed: result.failed });
    await loadPendingScans();

    // Clear result after 3 seconds
    setTimeout(() => setSyncResult(null), 3000);
  };

  // Clear scanned items list
  const clearScannedItems = () => {
    setScannedItems([]);
  };

  // Styles - Clean minimal design inspired by Stripe
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif";

  const containerStyle = {
    display: 'flex',
    'flex-direction': 'column',
    height: '100vh',
    background: '#f0f0eb',
    overflow: 'hidden',
    'font-family': fontFamily
  };

  const headerStyle = {
    background: '#ffffff',
    color: '#1a1a1a',
    padding: '1rem 1.25rem',
    'border-bottom': '1px solid #e3e8ee',
    'z-index': '10'
  };

  const statusBadgeStyle = (online: boolean) => ({
    display: 'inline-flex',
    'align-items': 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.75rem',
    'border-radius': '20px',
    'font-size': '0.75rem',
    'font-weight': '500',
    background: online ? '#e8f5e9' : '#fff3e0',
    color: online ? '#2e7d32' : '#e65100'
  });

  const tabsStyle = {
    display: 'flex',
    background: '#e3e8ee',
    'border-radius': '8px',
    padding: '4px',
    margin: '1rem 1.25rem 0',
    gap: '4px',
    'overflow-x': 'auto',
    '-webkit-overflow-scrolling': 'touch',
    'scrollbar-width': 'none'
  };

  const tabStyle = (active: boolean) => ({
    display: 'flex',
    'flex-direction': 'column' as const,
    'align-items': 'center',
    'justify-content': 'center',
    'min-width': '60px',
    padding: '0.5rem 0.5rem',
    border: 'none',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#1a1a1a' : '#7a7a7a',
    'border-radius': '6px',
    'font-size': '0.625rem',
    'font-weight': '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    'font-family': fontFamily,
    'box-shadow': active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
    'white-space': 'nowrap',
    'flex-shrink': '0'
  });

  const contentStyle = {
    flex: '1',
    position: 'relative' as const,
    overflow: 'hidden'
  };

  const scannerAreaStyle = {
    width: '100%',
    height: '100%',
    background: '#1a1a1a',
    position: 'relative' as const
  };

  const overlayStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '280px',
    height: '180px',
    border: '3px solid #625afa',
    'border-radius': '12px',
    'box-shadow': '0 0 30px rgba(98, 90, 250, 0.4)',
    'z-index': '5'
  };

  const textareaContainerStyle = {
    padding: '1.25rem',
    height: '100%',
    display: 'flex',
    'flex-direction': 'column',
    background: '#f0f0eb'
  };

  const textareaStyle = {
    flex: '1',
    width: '100%',
    padding: '1rem',
    border: '1px solid #e3e8ee',
    'border-radius': '12px',
    'font-size': '0.9375rem',
    'font-family': 'monospace',
    background: '#ffffff',
    color: '#1a1a1a',
    resize: 'none' as const,
    'min-height': '150px'
  };

  const pendingContainerStyle = {
    padding: '1.25rem',
    height: '100%',
    'overflow-y': 'auto',
    background: '#f0f0eb'
  };

  const controlsStyle = {
    background: '#ffffff',
    color: '#1a1a1a',
    padding: '1rem 1.25rem',
    'border-top': '1px solid #e3e8ee'
  };

  const selectStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '1px solid #e3e8ee',
    'border-radius': '8px',
    'font-size': '0.9375rem',
    'margin-bottom': '0.75rem',
    background: '#ffffff',
    color: '#1a1a1a',
    'font-family': fontFamily
  };

  const buttonStyle = (variant: 'primary' | 'success' | 'danger' | 'secondary') => ({
    padding: '0.75rem 1.25rem',
    'border-radius': '8px',
    border: 'none',
    'font-size': '0.9375rem',
    'font-weight': '500',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '0.5rem',
    background: variant === 'primary' ? '#625afa' :
                variant === 'success' ? '#30c85e' :
                variant === 'danger' ? '#df1b41' : '#e3e8ee',
    color: variant === 'secondary' ? '#1a1a1a' : '#ffffff',
    transition: 'all 0.15s',
    'font-family': fontFamily
  });

  const cardStyle = {
    background: '#ffffff',
    'border-radius': '12px',
    border: '1px solid #e3e8ee',
    padding: '1rem',
    'margin-bottom': '0.75rem'
  };

  const scanCardStyle = (success: boolean, offline: boolean) => ({
    padding: '1rem',
    background: '#ffffff',
    'border-radius': '12px',
    'margin-bottom': '0.5rem',
    border: `1px solid ${success ? (offline ? '#ffc107' : '#30c85e') : '#df1b41'}`,
    'border-left-width': '4px'
  });

  const formatBadgeStyle = (format: string) => ({
    'font-size': '0.6875rem',
    'font-weight': '600',
    background: format === 'standard' ? '#e8f0fe' : format === 'extended' ? '#f3e8ff' : '#f0f0eb',
    color: format === 'standard' ? '#1a73e8' : format === 'extended' ? '#7c3aed' : '#7a7a7a',
    padding: '0.125rem 0.5rem',
    'border-radius': '4px',
    'text-transform': 'uppercase' as const
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.5rem' }}>
          <h2 style={{ margin: '0', 'font-size': '1.125rem', 'font-weight': '600', color: '#1a1a1a' }}>
            HBL Scanner
          </h2>
          <div style={statusBadgeStyle(isOnline())}>
            <div style={{
              width: '8px',
              height: '8px',
              'border-radius': '50%',
              background: isOnline() ? '#30c85e' : '#ff9800',
              animation: isSyncing() ? 'pulse 1s infinite' : 'none'
            }} />
            {isOnline() ? 'Online' : 'Offline'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', 'font-size': '0.8125rem', color: '#7a7a7a' }}>
          <span>Guardados: <strong style={{ color: '#1a1a1a' }}>{successCount()}</strong></span>
          <span>Offline: <strong style={{ color: '#1a1a1a' }}>{offlineCount()}</strong></span>
          <span>Pendientes: <strong style={{ color: '#1a1a1a' }}>{pendingCount()}</strong></span>
        </div>

        {/* Tabs */}
        <div style={tabsStyle}>
          <button
            style={tabStyle(activeTab() === 'camera')}
            onClick={() => setActiveTab('camera')}
          >
            <span style={{ 'font-size': '1.25rem' }}>📷</span>
            <span>Camara</span>
          </button>
          <button
            style={tabStyle(activeTab() === 'textarea')}
            onClick={() => { setActiveTab('textarea'); stopScanning(); }}
          >
            <span style={{ 'font-size': '1.25rem' }}>📝</span>
            <span>Texto</span>
          </button>
          <button
            style={tabStyle(activeTab() === 'pending')}
            onClick={() => { setActiveTab('pending'); stopScanning(); loadPendingScans(); }}
          >
            <span style={{ 'font-size': '1.25rem' }}>⏳</span>
            <span>Pend. ({pendingCount()})</span>
          </button>
          <button
            style={tabStyle(activeTab() === 'download')}
            onClick={() => { setActiveTab('download'); stopScanning(); loadCachedData(); }}
          >
            <span style={{ 'font-size': '1.25rem' }}>📥</span>
            <span>Descargar</span>
          </button>
          <button
            style={tabStyle(activeTab() === 'manifest')}
            onClick={() => { setActiveTab('manifest'); stopScanning(); loadPendingScans(); }}
          >
            <span style={{ 'font-size': '1.25rem' }}>📋</span>
            <span>Manifiesto</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={contentStyle}>
        {/* Camera Tab */}
        <Show when={activeTab() === 'camera'}>
          <div style={scannerAreaStyle}>
            {/* Permission Request */}
            <Show when={hasPermission() === false}>
              <div style={{
                display: 'flex',
                'flex-direction': 'column',
                'justify-content': 'center',
                'align-items': 'center',
                height: '100%',
                background: '#f0f0eb',
                padding: '2rem',
                'text-align': 'center'
              }}>
                <div style={{ ...cardStyle, 'max-width': '320px', 'text-align': 'center' }}>
                  <div style={{ 'font-size': '2.5rem', 'margin-bottom': '1rem' }}>📷</div>
                  <div style={{ 'font-size': '1rem', 'font-weight': '500', color: '#1a1a1a', 'margin-bottom': '0.5rem' }}>Permiso de Camara Requerido</div>
                  <div style={{ 'font-size': '0.875rem', color: '#7a7a7a', 'margin-bottom': '1rem' }}>Necesitamos acceso a tu camara para escanear codigos</div>
                  <button style={buttonStyle('primary')} onClick={requestCameraPermission}>
                    Permitir Acceso
                  </button>
                </div>
              </div>
            </Show>

            {/* Loading State */}
            <Show when={hasPermission() === null}>
              <div style={{
                display: 'flex',
                'flex-direction': 'column',
                'justify-content': 'center',
                'align-items': 'center',
                height: '100%',
                background: '#f0f0eb'
              }}>
                <div style={{ ...cardStyle, 'text-align': 'center', padding: '2rem' }}>
                  <div style={{ 'font-size': '0.9375rem', color: '#7a7a7a' }}>Iniciando camara...</div>
                </div>
              </div>
            </Show>

            {/* Camera View */}
            <Show when={hasPermission()}>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  'object-fit': 'cover',
                  display: isScanning() ? 'block' : 'none'
                }}
                autoplay
                playsinline
              />
              <Show when={isScanning()}>
                <div style={overlayStyle}>
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '3px',
                    background: 'linear-gradient(90deg, transparent, #4caf50, transparent)',
                    animation: 'scan 2s linear infinite'
                  }} />
                </div>
              </Show>
            </Show>

            {/* Ready to Scan Message */}
            <Show when={hasPermission() && !isScanning()}>
              <div style={{
                display: 'flex',
                'flex-direction': 'column',
                'justify-content': 'center',
                'align-items': 'center',
                height: '100%',
                background: '#f0f0eb',
                padding: '2rem',
                'text-align': 'center'
              }}>
                <div style={{ ...cardStyle, 'max-width': '320px', 'text-align': 'center' }}>
                  <div style={{ 'font-size': '2.5rem', 'margin-bottom': '1rem' }}>📦</div>
                  <div style={{ 'font-size': '1rem', 'font-weight': '500', color: '#1a1a1a', 'margin-bottom': '0.5rem' }}>Listo para Escanear</div>
                  <p style={{ color: '#7a7a7a', 'font-size': '0.875rem', margin: '0' }}>Selecciona un estado e inicia el escaneo de codigos HBL</p>
                </div>
              </div>
            </Show>
          </div>
        </Show>

        {/* Textarea Tab */}
        <Show when={activeTab() === 'textarea'}>
          <div style={textareaContainerStyle}>
            <div style={{ ...cardStyle, flex: '1', display: 'flex', 'flex-direction': 'column' }}>
              <div style={{ 'margin-bottom': '0.75rem', color: '#7a7a7a', 'font-size': '0.875rem' }}>
                Pega o escribe los HBLs (uno por linea o separados por comas):
              </div>
              <textarea
                style={{ ...textareaStyle, flex: '1', border: '1px solid #e3e8ee' }}
                value={textareaInput()}
                onInput={(e) => setTextareaInput(e.currentTarget.value)}
                placeholder="230123456&#10;230654321&#10;TRE20272709..."
              />
              <button
                style={{ ...buttonStyle('primary'), width: '100%', 'margin-top': '0.75rem' }}
                onClick={handleTextareaSubmit}
                disabled={!textareaInput().trim() || !selectedStatusId() || isUpdating()}
              >
                {isUpdating() ? 'Procesando...' : 'Procesar HBLs'}
              </button>
            </div>
          </div>
        </Show>

        {/* Pending Tab */}
        <Show when={activeTab() === 'pending'}>
          <div style={pendingContainerStyle}>
            {/* Sync Button */}
            <Show when={isOnline() && pendingScans().length > 0}>
              <button
                style={{ ...buttonStyle('primary'), width: '100%', 'margin-bottom': '1rem' }}
                onClick={handleSync}
                disabled={isSyncing()}
              >
                {isSyncing() ? 'Sincronizando...' : `Sincronizar Todo (${pendingScans().length})`}
              </button>
            </Show>

            {/* Sync Result */}
            <Show when={syncResult()}>
              <div style={{
                ...cardStyle,
                background: '#e8f5e9',
                border: '1px solid #c8e6c9',
                color: '#2e7d32',
                'text-align': 'center'
              }}>
                Sincronizados: {syncResult()!.synced} | Fallidos: {syncResult()!.failed}
              </div>
            </Show>

            {/* Offline Warning */}
            <Show when={!isOnline()}>
              <div style={{
                ...cardStyle,
                background: '#fff3e0',
                border: '1px solid #ffe0b2',
                color: '#e65100',
                'text-align': 'center'
              }}>
                Sin conexion - los escaneos se sincronizaran cuando vuelva la conexion
              </div>
            </Show>

            {/* Pending Scans List */}
            <Show when={pendingScans().length === 0}>
              <div style={{ ...cardStyle, 'text-align': 'center', color: '#7a7a7a', padding: '2rem' }}>
                No hay escaneos pendientes
              </div>
            </Show>

            <For each={pendingScans()}>
              {(scan) => (
                <div style={{
                  ...cardStyle,
                  'border-left': '4px solid #ff9800'
                }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                    <div>
                      <div style={{ color: '#1a1a1a', 'font-weight': '600', 'font-family': 'monospace' }}>{scan.hbl}</div>
                      <div style={{ color: '#7a7a7a', 'font-size': '0.8125rem' }}>
                        {scan.statusLabel}
                      </div>
                      <div style={{ color: '#999999', 'font-size': '0.75rem' }}>
                        {new Date(scan.scannedAt).toLocaleString()}
                      </div>
                      <Show when={scan.retryCount > 0}>
                        <div style={{ color: '#e65100', 'font-size': '0.75rem' }}>
                          Reintentos: {scan.retryCount}
                        </div>
                      </Show>
                    </div>
                    <div style={{
                      padding: '0.25rem 0.75rem',
                      background: '#fff3e0',
                      'border-radius': '20px',
                      color: '#e65100',
                      'font-size': '0.75rem',
                      'font-weight': '500'
                    }}>
                      Pendiente
                    </div>
                  </div>
                  <Show when={scan.lastError}>
                    <div style={{
                      'margin-top': '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: '#ffebee',
                      'border-radius': '6px',
                      color: '#c62828',
                      'font-size': '0.75rem'
                    }}>
                      {scan.lastError}
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Download Tab */}
        <Show when={activeTab() === 'download'}>
          <div style={pendingContainerStyle}>
            {/* Cached HBLs count and user info */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.75rem' }}>
                <div>
                  <div style={{ color: '#7a7a7a', 'font-size': '0.8125rem' }}>HBLs Descargados</div>
                  <div style={{ color: '#1a1a1a', 'font-size': '2rem', 'font-weight': '600' }}>{cachedCount()}</div>
                </div>
                <Show when={cachedCount() > 0}>
                  <button
                    onClick={handleClearCache}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#ffebee',
                      color: '#c62828',
                      border: 'none',
                      'border-radius': '8px',
                      cursor: 'pointer',
                      'font-size': '0.8125rem',
                      'font-weight': '500'
                    }}
                  >
                    Limpiar Cache
                  </button>
                </Show>
              </div>

              {/* Cached User Info */}
              <Show when={cachedUser()}>
                <div style={{
                  padding: '0.5rem 0.75rem',
                  background: '#f0f0eb',
                  'border-radius': '6px',
                  'font-size': '0.8125rem',
                  color: '#7a7a7a'
                }}>
                  Usuario: {cachedUser().displayName || cachedUser().email}
                </div>
              </Show>
            </div>

            {/* Download Progress */}
            <Show when={isDownloading()}>
              <div style={{
                ...cardStyle,
                background: '#fffde7',
                border: '1px solid #fff9c4'
              }}>
                <div style={{ color: '#f57f17', 'font-size': '0.875rem', 'margin-bottom': '0.5rem', 'font-weight': '500' }}>
                  {downloadProgress().status}
                </div>
                <Show when={downloadProgress().total > 0}>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#e3e8ee',
                    'border-radius': '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(downloadProgress().current / downloadProgress().total) * 100}%`,
                      height: '100%',
                      background: '#625afa',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ color: '#7a7a7a', 'font-size': '0.75rem', 'margin-top': '0.5rem' }}>
                    {downloadProgress().current} / {downloadProgress().total}
                  </div>
                </Show>
              </div>
            </Show>

            {/* Download Result */}
            <Show when={downloadResult()}>
              <div style={{
                ...cardStyle,
                background: downloadResult()!.failed > 0 ? '#fff3e0' : '#e8f5e9',
                border: `1px solid ${downloadResult()!.failed > 0 ? '#ffe0b2' : '#c8e6c9'}`,
                color: downloadResult()!.failed > 0 ? '#e65100' : '#2e7d32',
                'text-align': 'center'
              }}>
                Descargados: {downloadResult()!.success} | Fallidos: {downloadResult()!.failed}
              </div>
            </Show>

           

            {/* Download by Search */}
            <div style={cardStyle}>
              <div style={{ color: '#7a7a7a', 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
                Descargar por busqueda:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  style={{
                    flex: '1',
                    padding: '0.75rem',
                    border: '1px solid #e3e8ee',
                    'border-radius': '8px',
                    'font-size': '0.9375rem',
                    background: '#ffffff',
                    color: '#1a1a1a'
                  }}
                  value={searchInput()}
                  onInput={(e) => setSearchInput(e.currentTarget.value)}
                  placeholder="Guia, HBL, nombre..."
                  disabled={isDownloading()}
                />
                <button
                  style={buttonStyle('primary')}
                  onClick={handleDownloadBySearch}
                  disabled={!searchInput().trim() || isDownloading() || !isOnline()}
                >
                  Buscar
                </button>
              </div>
            </div>

             {/* Download by List */}
             <Show when={authStore.isAdmin()}>
            <div style={cardStyle}>
              <div style={{ color: '#7a7a7a', 'font-size': '0.875rem', 'margin-bottom': '0.5rem' }}>
                Descargar por lista de HBLs:
              </div>
              <textarea
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e3e8ee',
                  'border-radius': '8px',
                  'font-size': '0.9375rem',
                  'font-family': 'monospace',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  resize: 'none' as const,
                  'min-height': '100px'
                }}
                value={downloadInput()}
                onInput={(e) => setDownloadInput(e.currentTarget.value)}
                placeholder="Pega HBLs aqui (uno por linea o separados por comas)..."
                disabled={isDownloading()}
              />
              <button
                style={{ ...buttonStyle('primary'), width: '100%', 'margin-top': '0.75rem' }}
                onClick={handleDownloadByList}
                disabled={!downloadInput().trim() || isDownloading() || !isOnline()}
              >
                {isDownloading() ? 'Descargando...' : 'Descargar HBLs'}
              </button>
            </div>
            </Show>

            {/* Offline Warning */}
            <Show when={!isOnline()}>
              <div style={{
                ...cardStyle,
                background: '#fff3e0',
                border: '1px solid #ffe0b2',
                color: '#e65100',
                'text-align': 'center'
              }}>
                Sin conexion - necesitas estar online para descargar HBLs
              </div>
            </Show>
          </div>
        </Show>

        {/* Manifest Tab */}
        <Show when={activeTab() === 'manifest'}>
          <div style={pendingContainerStyle}>
            {/* Manifest Preview Modal */}
            <Show when={showManifestPreview() && generatedManifest()}>
              <div style={{
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                background: 'rgba(0,0,0,0.9)',
                'z-index': '100',
                display: 'flex',
                'flex-direction': 'column',
                padding: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  'margin-bottom': '1rem'
                }}>
                  <h3 style={{ color: 'white', margin: '0', 'font-size': '1.25rem' }}>
                    Vista Previa Manifiesto
                  </h3>
                  <button
                    onClick={closeManifestPreview}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      'border-radius': '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Cerrar
                  </button>
                </div>

                {/* Manifest Content Preview */}
                <div style={{
                  flex: '1',
                  background: 'white',
                  'border-radius': '12px',
                  padding: '1.5rem',
                  'overflow-y': 'auto',
                  color: '#1a1a1a'
                }}>
                  <div style={{ 'text-align': 'center', 'border-bottom': '2px solid #333', 'padding-bottom': '1rem', 'margin-bottom': '1rem' }}>
                    <h2 style={{ margin: '0 0 0.25rem 0', 'font-size': '1.5rem' }}>MANIFIESTO DE CARGA</h2>
                    <div style={{ color: '#666' }}>{generatedManifest()!.id}</div>
                  </div>

                  <div style={{ display: 'flex', 'justify-content': 'space-around', 'margin-bottom': '1rem', 'flex-wrap': 'wrap', gap: '0.75rem' }}>
                    <div style={{ 'text-align': 'center' }}>
                      <div style={{ 'font-size': '0.6875rem', color: '#7a7a7a', 'text-transform': 'uppercase' }}>Fecha</div>
                      <div style={{ 'font-weight': '600', 'font-size': '0.875rem' }}>{generatedManifest()!.date}</div>
                    </div>
                    <div style={{ 'text-align': 'center' }}>
                      <div style={{ 'font-size': '0.6875rem', color: '#7a7a7a', 'text-transform': 'uppercase' }}>Total</div>
                      <div style={{
                        'font-weight': '600',
                        background: '#1a1a1a',
                        color: 'white',
                        padding: '0.25rem 0.625rem',
                        'border-radius': '15px',
                        'font-size': '0.875rem'
                      }}>{generatedManifest()!.totalPackages}</div>
                    </div>
                  </div>

                  {/* Hierarchical View: State → City → Rpto → Street → CID → Bag */}
                  <For each={generatedManifest()!.hierarchy}>
                    {(stateGroup) => (
                      <div style={{
                        'margin-bottom': '1rem',
                        background: '#ffffff',
                        'border-radius': '8px',
                        overflow: 'hidden',
                        border: '1px solid #e3e8ee'
                      }}>
                        {/* State Header */}
                        <div style={{
                          background: '#1a1a1a',
                          color: 'white',
                          padding: '0.625rem 1rem',
                          'font-weight': '600',
                          'font-size': '0.875rem',
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center'
                        }}>
                          <span>{stateGroup.state}</span>
                          <span style={{
                            background: 'rgba(255,255,255,0.2)',
                            padding: '0.125rem 0.5rem',
                            'border-radius': '10px',
                            'font-size': '0.75rem'
                          }}>{stateGroup.totalPackages} paq</span>
                        </div>

                        <For each={stateGroup.cities}>
                          {(cityGroup) => (
                            <div style={{ padding: '0.5rem' }}>
                              {/* City Header */}
                              <div style={{
                                background: '#625afa',
                                color: 'white',
                                padding: '0.5rem 0.75rem',
                                'border-radius': '6px',
                                'font-size': '0.8125rem',
                                'font-weight': '500',
                                display: 'flex',
                                'justify-content': 'space-between',
                                'align-items': 'center',
                                'margin-bottom': '0.5rem'
                              }}>
                                <span>{cityGroup.city}</span>
                                <span style={{
                                  background: 'rgba(255,255,255,0.2)',
                                  padding: '0.125rem 0.375rem',
                                  'border-radius': '8px',
                                  'font-size': '0.6875rem'
                                }}>{cityGroup.totalPackages}</span>
                              </div>

                              <For each={cityGroup.rptos}>
                                {(rptoGroup) => (
                                  <div style={{
                                    background: '#f8fdf9',
                                    'border-radius': '6px',
                                    'margin-bottom': '0.5rem',
                                    overflow: 'hidden'
                                  }}>
                                    {/* Rpto Header */}
                                    <div style={{
                                      background: '#30c85e',
                                      color: 'white',
                                      padding: '0.375rem 0.625rem',
                                      'font-size': '0.75rem',
                                      'font-weight': '500',
                                      display: 'flex',
                                      'justify-content': 'space-between',
                                      'align-items': 'center'
                                    }}>
                                      <span>{rptoGroup.rpto}</span>
                                      <span style={{
                                        background: 'rgba(255,255,255,0.25)',
                                        padding: '0.0625rem 0.375rem',
                                        'border-radius': '8px',
                                        'font-size': '0.625rem'
                                      }}>{rptoGroup.totalPackages}</span>
                                    </div>

                                    <div style={{ padding: '0.375rem' }}>
                                      <For each={rptoGroup.streets}>
                                        {(streetGroup) => (
                                          <div style={{
                                            background: '#ffffff',
                                            'border-radius': '6px',
                                            'margin-bottom': '0.375rem',
                                            border: '1px solid #e3e8ee',
                                            overflow: 'hidden'
                                          }}>
                                            {/* Street Header */}
                                            <div style={{
                                              background: '#f0f0eb',
                                              padding: '0.375rem 0.5rem',
                                              'font-size': '0.75rem',
                                              'font-weight': '500',
                                              color: '#1a1a1a',
                                              display: 'flex',
                                              'justify-content': 'space-between',
                                              'align-items': 'center',
                                              'border-bottom': '1px solid #e3e8ee'
                                            }}>
                                              <span>{[streetGroup.street, streetGroup.streetNo, streetGroup.between].filter(Boolean).join(' ')}</span>
                                              <span style={{
                                                color: '#7a7a7a',
                                                'font-size': '0.6875rem',
                                                'font-weight': '400'
                                              }}>{streetGroup.totalPackages} paq</span>
                                            </div>

                                            <div style={{ padding: '0.375rem' }}>
                                              <For each={streetGroup.customers}>
                                                {(customer) => (
                                                  <div style={{
                                                    background: '#fafafa',
                                                    'border-radius': '4px',
                                                    padding: '0.5rem',
                                                    'margin-bottom': '0.25rem'
                                                  }}>
                                                    {/* Customer Header */}
                                                    <div style={{
                                                      display: 'flex',
                                                      'align-items': 'center',
                                                      gap: '0.375rem',
                                                      'margin-bottom': '0.375rem',
                                                      'padding-bottom': '0.25rem',
                                                      'border-bottom': '1px solid #e3e8ee'
                                                    }}>
                                                      <span style={{
                                                        background: '#625afa',
                                                        color: 'white',
                                                        padding: '0.125rem 0.375rem',
                                                        'border-radius': '4px',
                                                        'font-size': '0.625rem',
                                                        'font-weight': '600'
                                                      }}>{customer.cid}</span>
                                                      <span style={{ 'font-size': '0.75rem', 'font-weight': '500' }}>{customer.consigneeName}</span>
                                                      <span style={{
                                                        color: '#7a7a7a',
                                                        'font-size': '0.625rem',
                                                        'margin-left': 'auto'
                                                      }}>{customer.totalPackages} paq</span>
                                                    </div>

                                                    {/* Bags */}
                                                    <For each={customer.bags}>
                                                      {(bag) => (
                                                        <div style={{
                                                          background: '#fffbeb',
                                                          padding: '0.375rem',
                                                          'border-radius': '4px',
                                                          'margin-bottom': '0.25rem',
                                                          border: '1px solid #fde68a'
                                                        }}>
                                                          <div style={{
                                                            'font-size': '0.6875rem',
                                                            color: '#d97706',
                                                            'font-weight': '600',
                                                            'margin-bottom': '0.25rem'
                                                          }}>
                                                            Bolsa {bag.bagnumber}
                                                          </div>
                                                          <For each={bag.items}>
                                                            {(item) => (
                                                              <div style={{
                                                                display: 'flex',
                                                                'align-items': 'center',
                                                                gap: '0.5rem',
                                                                'font-size': '0.6875rem',
                                                                padding: '0.125rem 0'
                                                              }}>
                                                                <span style={{
                                                                  'font-family': 'monospace',
                                                                  'font-weight': '600',
                                                                  color: '#1a1a1a'
                                                                }}>{item.hbl}</span>
                                                                <span style={{ color: '#7a7a7a' }}>×{item.quantity}</span>
                                                                <span style={{ color: '#7a7a7a' }}>{item.weight}kg</span>
                                                              </div>
                                                            )}
                                                          </For>
                                                        </div>
                                                      )}
                                                    </For>

                                                    {/* Items without bag */}
                                                    <For each={customer.items}>
                                                      {(item) => (
                                                        <div style={{
                                                          display: 'flex',
                                                          'align-items': 'center',
                                                          gap: '0.5rem',
                                                          'font-size': '0.6875rem',
                                                          padding: '0.125rem 0'
                                                        }}>
                                                          <span style={{
                                                            'font-family': 'monospace',
                                                            'font-weight': '600',
                                                            color: '#1a1a1a'
                                                          }}>{item.hbl}</span>
                                                          <span style={{ color: '#7a7a7a' }}>×{item.quantity}</span>
                                                          <span style={{ color: '#7a7a7a' }}>{item.weight}kg</span>
                                                          <span style={{ color: '#999', 'margin-left': 'auto' }}>{item.phone}</span>
                                                        </div>
                                                      )}
                                                    </For>
                                                  </div>
                                                )}
                                              </For>
                                            </div>
                                          </div>
                                        )}
                                      </For>
                                    </div>
                                  </div>
                                )}
                              </For>
                            </div>
                          )}
                        </For>
                      </div>
                    )}
                  </For>

                  <Show when={generatedManifest()!.notes}>
                    <div style={{
                      'margin-top': '1rem',
                      padding: '0.75rem',
                      background: '#fffef0',
                      border: '1px solid #ddd',
                      'border-radius': '4px'
                    }}>
                      <div style={{ 'font-weight': '600', 'margin-bottom': '0.25rem' }}>Notas:</div>
                      <div>{generatedManifest()!.notes}</div>
                    </div>
                  </Show>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', 'margin-top': '1rem' }}>
                  <button
                    onClick={() => setShowManifestPreview(false)}
                    style={{ ...buttonStyle('secondary'), flex: '1' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={printManifest}
                    style={{ ...buttonStyle('primary'), flex: '1' }}
                  >
                    Imprimir
                  </button>
                  <button
                    onClick={downloadManifestAsText}
                    style={{ ...buttonStyle('success'), flex: '1' }}
                  >
                    Descargar TXT
                  </button>
                </div>
              </div>
            </Show>

            {/* Selection Header */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '0.75rem' }}>
                <div>
                  <div style={{ color: '#7a7a7a', 'font-size': '0.8125rem' }}>Generar Manifiesto Offline</div>
                  <div style={{ color: '#1a1a1a', 'font-size': '1.5rem', 'font-weight': '600' }}>
                    {selectedForManifest().size} seleccionados
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={selectAllForManifest}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: '#e8f0fe',
                      color: '#1a73e8',
                      border: 'none',
                      'border-radius': '6px',
                      cursor: 'pointer',
                      'font-size': '0.8125rem',
                      'font-weight': '500'
                    }}
                  >
                    Todos
                  </button>
                  <button
                    onClick={deselectAllForManifest}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: '#f0f0eb',
                      color: '#7a7a7a',
                      border: 'none',
                      'border-radius': '6px',
                      cursor: 'pointer',
                      'font-size': '0.8125rem',
                      'font-weight': '500'
                    }}
                  >
                    Ninguno
                  </button>
                </div>
              </div>

              {/* Notes Input */}
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e3e8ee',
                  'border-radius': '8px',
                  'font-size': '0.9375rem',
                  background: '#ffffff',
                  color: '#1a1a1a',
                  'margin-bottom': '0.75rem'
                }}
                value={manifestNotes()}
                onInput={(e) => setManifestNotes(e.currentTarget.value)}
                placeholder="Notas adicionales (opcional)..."
              />

              {/* Generate Button */}
              <button
                style={{ ...buttonStyle('primary'), width: '100%' }}
                onClick={generateManifest}
                disabled={selectedForManifest().size === 0}
              >
                Generar Manifiesto ({selectedForManifest().size} HBLs)
              </button>
            </div>

            {/* Available HBLs List */}
            <Show when={pendingScans().length === 0}>
              <div style={{ ...cardStyle, 'text-align': 'center', color: '#7a7a7a', padding: '2rem' }}>
                No hay HBLs pendientes para incluir en el manifiesto
              </div>
            </Show>

            <Show when={pendingScans().length > 0}>
              <div style={{ color: '#7a7a7a', 'font-size': '0.875rem', 'margin-bottom': '0.75rem' }}>
                Selecciona los HBLs para el manifiesto:
              </div>
            </Show>

            <For each={pendingScans()}>
              {(scan) => (
                <div
                  style={{
                    ...cardStyle,
                    padding: '0.875rem',
                    background: selectedForManifest().has(scan.hbl) ? '#f3e8ff' : '#ffffff',
                    border: selectedForManifest().has(scan.hbl) ? '2px solid #625afa' : '1px solid #e3e8ee',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onClick={() => toggleManifestSelection(scan.hbl)}
                >
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '0.75rem' }}>
                    {/* Checkbox */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      'border-radius': '4px',
                      border: selectedForManifest().has(scan.hbl) ? 'none' : '2px solid #e3e8ee',
                      background: selectedForManifest().has(scan.hbl) ? '#625afa' : '#ffffff',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      'flex-shrink': '0'
                    }}>
                      <Show when={selectedForManifest().has(scan.hbl)}>
                        <span style={{ color: 'white', 'font-size': '0.75rem', 'font-weight': 'bold' }}>✓</span>
                      </Show>
                    </div>

                    <div style={{ flex: '1' }}>
                      <div style={{ color: '#1a1a1a', 'font-weight': '600', 'font-family': 'monospace' }}>{scan.hbl}</div>
                      <div style={{ color: '#7a7a7a', 'font-size': '0.8125rem' }}>
                        {scan.statusLabel}
                      </div>
                    </div>

                    <div style={{ color: '#999999', 'font-size': '0.75rem', 'text-align': 'right' }}>
                      {new Date(scan.scannedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Bottom Controls */}
      <div style={controlsStyle}>
        {/* Status Selection - Only on camera/textarea tabs */}
        <Show when={activeTab() === 'camera' || activeTab() === 'textarea'}>
          <select
            style={selectStyle}
            value={selectedStatusId()}
            onChange={(e) => {
              setSelectedStatusId(e.currentTarget.value);
              if (e.currentTarget.value && hasPermission() && !isScanning() && activeTab() === 'camera') {
                startScanning();
              }
            }}
            disabled={allowedStatusLocations().length === 0}
          >
            <Show when={allowedStatusLocations().length === 0}>
              <option value="">No tienes permisos para escanear</option>
            </Show>
            <Show when={allowedStatusLocations().length > 0}>
              <option value="">Seleccionar Estado ({allowedStatusLocations().length} disponibles)</option>
              <For each={allowedStatusLocations()}>
                {(status) => (
                  <option value={status.id}>
                    {status.label} {status.tag ? `(${status.tag})` : ''}
                  </option>
                )}
              </For>
            </Show>
          </select>

          {/* No Permissions Warning */}
          <Show when={allowedStatusLocations().length === 0}>
            <div style={{
              background: '#fff3e0',
              color: '#e65100',
              padding: '0.75rem',
              'border-radius': '8px',
              'margin-bottom': '0.75rem',
              'font-size': '0.875rem',
              'text-align': 'center',
              border: '1px solid #ffe0b2'
            }}>
              No tienes permisos para escanear en ninguna ubicacion. Contacta al administrador.
            </div>
          </Show>
        </Show>

        {/* Camera Controls (only on camera tab) */}
        <Show when={activeTab() === 'camera'}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              style={{
                ...buttonStyle(selectedStatusId() ? (isScanning() ? 'danger' : 'success') : 'secondary'),
                flex: '1'
              }}
              onClick={toggleScanning}
              disabled={!selectedStatusId() || hasPermission() === false}
            >
              {isScanning() ? 'Detener' : 'Iniciar Escaneo'}
            </button>
          </div>
        </Show>

        {/* Processing indicator */}
        <Show when={isUpdating()}>
          <div style={{
            background: '#fffde7',
            color: '#f57f17',
            padding: '0.75rem',
            'border-radius': '8px',
            'text-align': 'center',
            'margin-top': '0.75rem',
            border: '1px solid #fff9c4'
          }}>
            Procesando {lastScannedHBL()}...
          </div>
        </Show>

        {/* Error Display */}
        <Show when={error()}>
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '0.75rem',
            'border-radius': '8px',
            'text-align': 'center',
            'margin-top': '0.75rem',
            border: '1px solid #ffcdd2'
          }}>
            {error()}
          </div>
        </Show>

      </div>
    </div>
  );
};

export default HBLOfflineScanner;




/*


230169195
230169196
230169104
230169077

 */