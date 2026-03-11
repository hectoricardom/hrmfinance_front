import { Component, createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { Button, Card, FormInput } from '../../ui';
import { useTranslation } from '../../../translations';
import { inventoryApi } from '../../../services/apiAdapter';
import { HBLListFilter, printHBLList, exportHBLListToCSV } from '../list';
import { HBLDetailView } from '../details';
import { HBL } from '../types';
import { hblStore } from '../data/hblStore';
import { devLog } from '../../../services/utils';

// Sample HBL data for demonstration
const sampleHBLData: HBL[] = [
  {
    idreserve: '144245',
    idreservestate: '',
    idairnumber: '175-24013802 AVCENTR18',
    idairguide: '175-24013802',
    idclasification: 'ENVIO',
    datereserve: '2025-07-15',
    hbl: '230144600',
    cidentity: '51030502941',
    street: 'CALLE 21 # 5608 e/ AVE 56 y 58, CIENFUEGOS, CIENFUEGOS',
    ctelephone: '59448095',
    nameshipper: 'LISET MANZANO',
    quantity: '1',
    weight: '10.09',
    idguidestate: 'EN BODEGA',
    namegood: 'MICELANEAS',
    bagnumber: 'YAC17062',
    agency: '2',
    guia: '2518',
    consigneeName: 'RUBEN RAYA REYES',
    phoneshipper: '8323783469',
    address: {
      estate: 'CIENFUEGOS',
      city: 'CIENFUEGOS',
      streetName: '21',
      streetNo: '5608',
      betwen: 'AVE 56 Y 58'
    },
    referenceHId: '6sstbpt3tqg2lcw6_1752688667657'
  },
  {
    idreserve: '144246',
    idreservestate: '',
    idairnumber: '175-24013803 AVCENTR18',
    idairguide: '175-24013803',
    idclasification: 'ENVIO',
    datereserve: '2025-07-16',
    hbl: '230144601',
    cidentity: '52040603852',
    street: 'CALLE 45 # 2310 e/ 23 y 25, LA HABANA, LA HABANA',
    ctelephone: '53178234',
    nameshipper: 'MARIA GONZALEZ',
    quantity: '2',
    weight: '15.50',
    idguidestate: 'ENVIADO',
    namegood: 'ROPA Y ZAPATOS',
    bagnumber: 'YAC17063',
    agency: '2',
    guia: '2518',
    consigneeName: 'JUAN PEREZ GARCIA',
    phoneshipper: '7863456789',
    address: {
      estate: 'LA HABANA',
      city: 'LA HABANA',
      streetName: '45',
      streetNo: '2310',
      betwen: '23 Y 25'
    },
    referenceHId: '6sstbpt3tqg2lcw7_1752688667658'
  },
  {
    idreserve: '144247',
    idreservestate: '',
    idairnumber: '175-24013804 AVCENTR18',
    idairguide: '175-24013804',
    idclasification: 'PAQUETE',
    datereserve: '2025-07-14',
    hbl: '230144602',
    cidentity: '49120704963',
    street: 'AVE 31 # 1802 e/ 18 y 20, MATANZAS, MATANZAS',
    ctelephone: '45267890',
    nameshipper: 'CARLOS RODRIGUEZ',
    quantity: '3',
    weight: '25.00',
    idguidestate: 'ENTREGADO',
    namegood: 'ELECTRODOMESTICOS',
    bagnumber: 'YAC17064',
    agency: '3',
    guia: '2519',
    consigneeName: 'ANA MARTINEZ LOPEZ',
    phoneshipper: '3054567890',
    address: {
      estate: 'MATANZAS',
      city: 'MATANZAS',
      streetName: '31',
      streetNo: '1802',
      betwen: '18 Y 20'
    },
    referenceHId: '6sstbpt3tqg2lcw8_1752688667659'
  },
  {
    idreserve: '144248',
    idreservestate: '',
    idairnumber: '175-24013805 AVCENTR18',
    idairguide: '175-24013805',
    idclasification: 'ENVIO',
    datereserve: '2025-07-17',
    hbl: '230144603',
    cidentity: '53050805074',
    street: 'CALLE B # 567 e/ 5ta y 7ma, SANTIAGO DE CUBA, SANTIAGO DE CUBA',
    ctelephone: '22654321',
    nameshipper: 'PEDRO SANCHEZ',
    quantity: '1',
    weight: '8.75',
    idguidestate: 'EN BODEGA',
    namegood: 'MEDICINA Y ALIMENTOS',
    bagnumber: 'YAC17065',
    agency: '1',
    guia: '2519',
    consigneeName: 'LUCIA FERNANDEZ DIAZ',
    phoneshipper: '9543210987',
    address: {
      estate: 'SANTIAGO DE CUBA',
      city: 'SANTIAGO DE CUBA',
      streetName: 'B',
      streetNo: '567',
      betwen: '5TA Y 7MA'
    },
    referenceHId: '6sstbpt3tqg2lcw9_1752688667660'
  },
  {
    idreserve: '144249',
    idreservestate: '',
    idairnumber: '175-24013806 AVCENTR18',
    idairguide: '175-24013806',
    idclasification: 'PAQUETE',
    datereserve: '2025-07-18',
    hbl: '230144604',
    cidentity: '48030906185',
    street: 'CALLE 100 # 4512 e/ 45 y 47, CAMAGUEY, CAMAGUEY',
    ctelephone: '32123456',
    nameshipper: 'ELENA RAMIREZ',
    quantity: '2',
    weight: '12.30',
    idguidestate: 'PENDIENTE',
    namegood: 'HERRAMIENTAS Y REPUESTOS',
    bagnumber: 'YAC17066',
    agency: '2',
    guia: '2520',
    consigneeName: 'ROBERTO JIMENEZ CASTRO',
    phoneshipper: '7542345678',
    address: {
      estate: 'CAMAGUEY',
      city: 'CAMAGUEY',
      streetName: '100',
      streetNo: '4512',
      betwen: '45 Y 47'
    },
    referenceHId: '6sstbpt3tqg2lcw10_1752688667661'
  }
];

const HBLList: Component = () => {
  const { t } = useTranslation();
  const [hbls, setHbls] = createSignal<HBL[]>([]);
  const [selectedHBL, setSelectedHBL] = createSignal<HBL | null>(null);
  const [filteredHBLs, setFilteredHBLs] = createSignal<HBL[]>([]);
  const [guideFilter, setGuideFilter] = createSignal<string>('all');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [isUpdatingNames, setIsUpdatingNames] = createSignal(false);
  const [updateStats, setUpdateStats] = createSignal<{total: number, updated: number} | null>(null);

  const handleHBLSelect = (hbl: HBL) => {
    setSelectedHBL(hbl);
  };
  
  const handleFilterChange = (filtered: HBL[]) => {
    setFilteredHBLs(filtered);
  };

   const handleGuideChange = (filtered: any) => {
    setGuideFilter(filtered);
    fetchHbl();
  };


  /**
   * Update consignee names for HBLs with missing names
   */
  const updateConsigneeNames = async () => {
    const currentHBLs = hbls();
    if (currentHBLs.length === 0) {
      return;
    }

    setIsUpdatingNames(true);
    setUpdateStats(null);

    try {
      devLog('Starting consignee name update...');


      // Count HBLs with missing names
      const missingNames = currentHBLs.filter(hbl => !hbl?.consigneeName || hbl?.consigneeName?.trim() === '');
      devLog(`Found ${missingNames.length} HBLs with missing consignee names out of ${currentHBLs.length} total`);


      currentHBLs.map(hbl =>{devLog(hbl.hbl, hbl?.consigneeName?.trim())});

      devLog(currentHBLs)
      // Update using the store function
      const updatedHBLs = await hblStore.checkAndUpdateConsigneeNames(currentHBLs);


      // Count how many were updated
      const updatedCount = updatedHBLs.filter((hbl, index) => {
        const original = currentHBLs[index];
        return original.consigneeName !== hbl.consigneeName && hbl.consigneeName;
      }).length;

      // Update local state with new HBL data
      setHbls(updatedHBLs);
      setUpdateStats({ total: missingNames.length, updated: updatedCount });

      devLog(`Update complete: ${updatedCount} consignee names updated`);
    } catch (error) {
      devLog('Error updating consignee names:', error);
      alert('Error updating consignee names. Check console for details.');
    } finally {
      setIsUpdatingNames(false);
    }
  };

  const fetchHbl = async () => {
    if(!searchTerm().trim()){
      //setHbls([]);
      return null;
    }

    let hh = await  inventoryApi.getHBLS(searchTerm().trim(),{
        guia: guideFilter()
    })

    if(hh?.error){
      setHbls([]);
    }else {
      const fetchedHBLs = Object.values(hh);
      setHbls(fetchedHBLs);

      // Automatically update consignee names after fetching
      setTimeout(async () => {
       // await updateConsigneeNames();
      }, 500);
    }
     

      /*

      let tst = ` 
    230150072, 230150073
 
230147414, 230147415, 230147416,230145206, 230145255, 230146292, 230146293, 230146294, 230146295, 230146296, 230146297, 230145207, 230145388, 230146568, 230145831,230145369.
 
230147481, 230147482,230147483, 230144933, 230144934, 230145642, 230145401, 230144904, 230147442, 230147478, 230147479, 230147480, 230147484, 230145378, 230144624, 230144851, 230146777, 230146778, 230146779, 230145407, 230145408, 230145409, 230144863.
 
230145809, 230147055, 230147056, 230145623, 230145624, 230145625, 230145626, 230144958, 230146218, 230144650, 230144869, 230145443, 230144807, 230147487, 230145035, 230144930, 230144931, 230144932, 230146515, 230145000, 230145629, 230145630, 230145631, 230147469, 230147470, 230147471, 230144621, 230144620, 230144619, 230145654, 230144612, 230145382, 230145383, 230144605,230144649, 230144926, 230144927, 230144928, 230145656, 230145639, 230145640, 230145641, 230144860, 230144861, 230144905, 230145290, 230145291, 230145292, 230145293, 230145294, 230147464, 230147465, 230144604, 230145387, 230144822, 230145390, 230147488, 230145008, 230144816, 230144823, 230144811, 230144812, 230144813, 230144814, 230144815.
`
      let ffi:HBL[] = []

      Object.values(hh).map((rr: any)=>{
        console.log(rr.hbl)
        if(tst.indexOf(rr.hbl)>=0){
            ffi.push(rr)
        }
      })
      setHbls(ffi);

//175-24013861

      */
      
   }

  onMount(()=>{
    //fetchHbl();
  })
  


  const uniqueGuides = createMemo(() => {
    const guides = new Set([ 2523, 2524, 2525, 2526, 2527, 2528, 2529, 2530,2531,2532, 2533, 2534 ].map(hbl => hbl));
    return Array.from(guides).sort((a, b) => a - b);
  });
  

  const handlePrintList = () => {
    const listToPrint = filteredHBLs().length > 0 ? filteredHBLs() : hbls();
    if (listToPrint.length === 0) {
      alert(t('hbl.noDataToPrint', 'No HBL data to print'));
      return;
    }
    printHBLList(listToPrint, t('hbl.printTitle', 'HBL List Report'));
  };

  const handleExportCSV = () => {
    const listToExport = filteredHBLs().length > 0 ? filteredHBLs() : hbls();
    if (listToExport.length === 0) {
      alert(t('hbl.noDataToExport', 'No HBL data to export'));
      return;
    }
    exportHBLListToCSV(listToExport, `hbl_list_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ 
        'margin-bottom': '2rem',
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center'
      }}>
        <h1 style={{ 
          'font-size': '1.5rem',
          'font-weight': '600',
          color: 'var(--text-primary)'
        }}>
          {t('hbl.title', 'House Bill of Lading Management')}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              cursor: isUpdatingNames() ? 'not-allowed' : 'pointer',
              'font-weight': '500',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem',
              opacity: isUpdatingNames() ? '0.6' : '1'
            }}
            onClick={updateConsigneeNames}
            disabled={isUpdatingNames() || hbls().length === 0}
            title="Update missing consignee names from database"
          >
            <Show when={isUpdatingNames()} fallback={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <polyline points="17 11 19 13 23 9"></polyline>
              </svg>
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke-dasharray="2 4"/>
              </svg>
            </Show>
            {isUpdatingNames() ? 'Updating...' : 'Update Names'}
          </button>

          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--success-color, #28a745)',
              color: 'white',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-weight': '500',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}
            onClick={handlePrintList}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            {t('hbl.print', 'Print List')}
          </button>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--info-color, #17a2b8)',
              color: 'white',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-weight': '500',
              display: 'flex',
              'align-items': 'center',
              gap: '0.5rem'
            }}
            onClick={handleExportCSV}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            {t('hbl.exportCSV', 'Export CSV')}
          </button>
          <button
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              'border-radius': 'var(--border-radius-sm)',
              cursor: 'pointer',
              'font-weight': '500'
            }}
          >
            {t('hbl.addNew', 'Add New HBL')}
          </button>
        </div>
      </div>

      {/* Update Status Notification */}
      <Show when={updateStats()}>
        <div style={{
          padding: '1rem',
          'margin-bottom': '1rem',
          background: updateStats()!.updated > 0 ? '#d1fae5' : '#fef3c7',
          border: `1px solid ${updateStats()!.updated > 0 ? '#10b981' : '#f59e0b'}`,
          'border-radius': 'var(--border-radius-sm)',
          display: 'flex',
          'align-items': 'center',
          gap: '0.75rem'
        }}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={updateStats()!.updated > 0 ? '#10b981' : '#f59e0b'}
            stroke-width="2"
          >
            <Show when={updateStats()!.updated > 0} fallback={
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            }>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </Show>
          </svg>
          <div style={{ flex: '1' }}>
            <strong style={{
              color: updateStats()!.updated > 0 ? '#065f46' : '#92400e',
              'font-size': '0.95rem'
            }}>
              {updateStats()!.updated > 0
                ? `✓ Successfully updated ${updateStats()!.updated} consignee name${updateStats()!.updated !== 1 ? 's' : ''}`
                : `⚠ No consignee names could be updated`
              }
            </strong>
            <p style={{
              margin: '0.25rem 0 0 0',
              'font-size': '0.85rem',
              color: updateStats()!.updated > 0 ? '#047857' : '#78350f'
            }}>
              {updateStats()!.total} HBL{updateStats()!.total !== 1 ? 's' : ''} had missing names.
              {updateStats()!.updated < updateStats()!.total &&
                ` ${updateStats()!.total - updateStats()!.updated} could not be found in the database.`
              }
            </p>
          </div>
          <button
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: updateStats()!.updated > 0 ? '#065f46' : '#92400e'
            }}
            onClick={() => setUpdateStats(null)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </Show>

      <Card>
              <div style={{ padding: '1rem' }}>
                 <div style={{ width: '13rem' }}>
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
                        onChange={(e) => handleGuideChange(e.currentTarget.value)}
                      >
                        <option value="all">{t('common.all', 'All')}</option>
                        <For each={uniqueGuides()}>
                          {(guide) => <option value={guide}>{t('hbl.guideNo', 'Guide No.')} {guide}</option>}
                        </For>
                      </select>
                    </div>
                      <FormInput
                        type="text"
                        placeholder={t('hbl.searchPlaceholder', 'Search by HBL#, air guide, shipper, consignee, commodity, bag#, identity...')}
                        value={searchTerm()}
                        // /onInput={(e) => setSearchTerm(e.currentTarget?.value)}
                        onChange={(e)=> setSearchTerm(e)}
                      />
                        
              </div>
                <Button
                variant="outline"
                size="sm"
                onClick={fetchHbl}
              >
               Buscar
              </Button>
        </Card>
      
      <HBLListFilter
        hbls={hbls()}
        onFilterChange={handleFilterChange}
        guideFilter={guideFilter()}
        onHBLSelect={handleHBLSelect}
      />
      
      <HBLDetailView
        hbl={selectedHBL()}
        isOpen={selectedHBL() !== null}
        onClose={() => setSelectedHBL(null)}
      />
    </div>
  );
};

export default HBLList;




/*



make a motion to case dismiss pro se based on i already have my LPR since 01/12/2024

Yoxania Molina Avila
 A: 240 914 345
 Dob: 06/09/2000
 PO Box 6
 Fairdale KY 40118
5024363653

made on 10/03/2025



 Inmigration Court
Attn: Judge Robert Q Ward
80 Monroe Ave, Garden LVL G-10
Memphis, TN 38103



Office of the Principal Legal Advisor
80 Monroe Ave, Suite 200
Memphis, TN 38103

 */




