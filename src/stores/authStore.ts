import { createSignal, createEffect, createRoot } from 'solid-js';
import { createStore } from 'solid-js/store';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, db, doc, getDoc, googleProvider, setDoc, updateDoc } from '../services/firebase';
import { decodeGoogleToken, googleSignOut } from '../services/googleCloud';
import { fetchGraphQL, getCookie } from '../services/utils';
import { firestoreProxy, firestoreFallback } from '../services/firestoreProxy';
import { businessApi, storesApi } from '../services/apiAdapter';
import { cacheAuthState, getCachedAuthState, clearCachedAuthState, isOnlineNow } from '../modules/hbl/offline/offlineDataService';


// Wrap store creation in createRoot to provide owner context
const [queryCode, setQueryCode] = createRoot(() => createStore<Record<string, any>>({}));




const isDev = process.env.NODE_ENV === 'development';

export function devUsLog(...args: any) {
  if (isDev) {
    console.log(...args);
  }
}


export const initQry = async () => {
  let bdyq2 = {
      query: "qcm42351987"
  };
  const td = await fetchGraphQL(bdyq2);
 
  if (td && !td.error) {
      let qcb = {};
      let updQry = Object.assign({},qcb, td);
      setQueryCode(updQry);
  }
  //loadMnfList();
  return 1;
};







export const loadMnfList = async () => {
  let bdyq1 = {
      query: "qml987lg1936"
  };
  const td2 = await fetchGraphQL(bdyq1);
  if (td2 && !td2.error) {
    
   
  }
}

// eyJwYXlsb2FkIjp7InVpZCI6IjExODQwNzczMDA0NzIyMDQ2NzI1MCIsImVtYWlsIjoieXVkaXRocG04MkBnbWFpbC5jb20iLCJsYXN0VmVyaWZpZWQiOiIyMDI1LTExLTIyVDAxOjI1OjM2LjM4NloifSwic2lnbmF0dXJlIjoiOGRhZmRmNDgzMzM2YTc3ZmM2Njk0ZTU1MzNhMzUyNjUzMzBkNWE2ZTY4NDY3M2JkYzcyOTRmNThkNDM0YTc3NSIsInRpbWVzdGFtcCI6MTc2Mzc3NDczNjM4OCwiZXhwaXJlc0F0IjoxNzYzODYxMTM2Mzg4LCJub25jZSI6IjM0ZDEyODYwZGNiMDNmNTNiOGIxMjBkM2U4YTRiMDcyIiwiY2xpZW50SVAiOiJ1bmtub3duIn0

export const validateToken = async (token?: string) =>{

  //devUsLog('validateToken on params ', token )

  let url = "https://ssgloghr.com/auth/verify-signature"
  if (!token) {
   
    token =  getCookie("ssgl_access_tkn") || "";
  }

  //devUsLog('validateToken ssgl_access_tkn cookie ', token )
  if(!token){
    return null;
  }  


  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Authorization': token,
    },
    body: JSON.stringify({
      token
    }),
  });




  if(response.status === 401 || response.status ===500){
    setAuthState({
      user: null,
      profile: null,
      loading: false,
      error: null,

    });
     document.cookie = `ssgl_access_tkn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
     return;
  }


 if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();



    if(data?.valid){

      setAuthState({
        user: data?.user,
        profile: data?.user,
        loading: false,
        error: null,
        authMethod: 'google-cloud'
      });

      // Cache auth state for offline use
      try {
        await cacheAuthState(data?.user, data?.user, 'google-cloud');
      } catch (cacheError) {
        console.warn('Failed to cache auth state:', cacheError);
      }

      setTimeout(() => {
          authStore.initializeBusinessContext();
          authStore.loadStoresFromFirestore();
      }, 100);

    }

    
    /**
    // Load full user profile from Firestore
    if (false && data?.user?.uidf) {
      try {
        await authStore.getUserProfile(data.user.uid);
        // Initialize business context and load stores after profile is loaded
        setTimeout(() => {
          authStore.initializeBusinessContext();
          authStore.loadStoresFromFirestore();
        }, 100);
      } catch (profileError) {
        console.error('Error loading user profile:', profileError);
      }
    }
    */

  }


export const validateTkn = async (user: any) =>{

  let token = await user?.getIdToken();

  if(user?.stsTokenManager?.expirationTime>(new Date()).getTime()){
      validateToken(token)
  }
  else{
     validateToken()
  }

  
 
  //devUsLog(token)

  



    /* 




  let Qry_V = queryCode?.[992002];



  devUsLog(authStore.profile())
           

  const td2 = await fetch();

  if (td2 && !td2.error) {
    
   
  }


  if(Qry_V){
    Qry_V.params = {
      tkn:  token
    }



    if (tdV?.userId) {
        //updStore(qryKprofile(),tdV)
        //updStore("isAdmin",tdV.isAdmin);
        //updStore("hasNotaryAccess",tdV.hasNotaryAccess);
        let accessActivities = [];
        ObjectKeys(tdV.accessActivities).map(kA=>{
          let itm = tdV.accessActivities[kA];
          if(itm.isActive){
            accessActivities.push({id: itm.idCode, label: itm.label});
          }
        })
        //updStore("accessActivities",tdV.accessActivities )
        //updStore("accessActivitiesDrodDwn",accessActivities )
        setGlobalAuth("profile", tdV);
        let newd = {...tdV}
        newd._id = "118238";
     
   
        setGlobalAuthImage(tdV?.picture);
        setGlobalRoles("roles", tdV?.accessLogistic)

        let flm = [];
        getStore("M023009")?.statusAllList.map(f=> {
          if(tdV?.accessLogistic?.[f.id]?.isActive){
            flm.push(f);
          }
        })

        updStore("scaninglocation",flm)
        setScaninglocationList("list",flm)
        setYabaScaninglocation("list",flm)

       setTimeout(() => {
          loadLibrary("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.6.172/build/pdf.worker.min.js");
          setTimeout(() => {
            loadMatrixCode();
          }, 1800);
        }, 1800);
        
        
    }
    */
  
}





export interface AuthState {
  user: User | null;
  profile?: any | null;
  loading: boolean;
  error: string | null;
  authMethod: 'firebase' | 'google-cloud' | 'magic-link' | null;
}

interface GoogleCloudUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Store interface for global access
interface StoreInfo {
  id: string;
  name: string;
  isActive?: boolean;
}

// Helper to get initial year from localStorage
const getInitialYear = (): number => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('hrmfinance-selected-year');
    if (stored) {
      const year = parseInt(stored, 10);
      if (!isNaN(year) && year >= 2020 && year <= 2030) {
        return year;
      }
    }
  }
  return new Date().getFullYear();
};

// Helper to get initial businessId from localStorage
const getInitialBusinessId = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('hrmfinance-selected-business-id');
    if (stored) {
      return stored;
    }
  }
  return 'all';
};

// Wrap reactive state in createRoot to provide owner context
const { authState, setAuthState, googleCloudUser, setGoogleCloudUser, currentBusinessId, setCurrentBusinessId, availableStores, setAvailableStores, filteredStores, setFilteredStores, selectedYear, setSelectedYear } = createRoot(() => {
  const [authState, setAuthState] = createStore<AuthState>({
    user: null,
    loading: true,
    error: null,
    authMethod: null
  });

  const [googleCloudUser, setGoogleCloudUser] = createSignal<GoogleCloudUser | null>(null);

  // Global business and store management
  const [currentBusinessId, setCurrentBusinessId] = createSignal<string>(getInitialBusinessId());
  const [availableStores, setAvailableStores] = createSignal<StoreInfo[]>([]);
  const [filteredStores, setFilteredStores] = createSignal<StoreInfo[]>([]);

  // Year selector (reactive signal backed by localStorage)
  const [selectedYear, setSelectedYear] = createSignal<number>(getInitialYear());

  return {
    authState,
    setAuthState,
    googleCloudUser,
    setGoogleCloudUser,
    currentBusinessId,
    setCurrentBusinessId,
    availableStores,
    setAvailableStores,
    filteredStores,
    setFilteredStores,
    selectedYear,
    setSelectedYear
  };
});





// Initialize session from cookie on app load
const initializeSession = async () => {
  const token = getCookie("ssgl_access_tkn");

  // Check if we're offline first
  if (!isOnlineNow()) {
    devUsLog("📴 Offline mode detected, checking for cached auth...");
    try {
      const cachedAuth = await getCachedAuthState();
      if (cachedAuth && cachedAuth.user) {
        devUsLog("✅ Restoring auth from offline cache for:", cachedAuth.user.email);
        setAuthState({
          user: cachedAuth.user as User,
          profile: cachedAuth.profile,
          loading: false,
          error: null,
          authMethod: cachedAuth.authMethod
        });
        return;
      } else {
        devUsLog("⚠️ No cached auth found for offline mode");
        setAuthState({
          user: null,
          loading: false,
          error: 'Sin conexión. Por favor, inicie sesión cuando esté en línea.',
          authMethod: null
        });
        return;
      }
    } catch (error) {
      console.error("❌ Failed to restore offline auth:", error);
      setAuthState({
        user: null,
        loading: false,
        error: 'Error al restaurar sesión offline',
        authMethod: null
      });
      return;
    }
  }

  // Online mode - validate with server
  if (token && token?.trim()) {
    devUsLog("🔑 Found existing session token, validating...");
    try {
      await validateToken();
    } catch (error) {
      console.error("❌ Session validation failed:", error);
      // Try cached auth as fallback
      try {
        const cachedAuth = await getCachedAuthState();
        if (cachedAuth && cachedAuth.user) {
          devUsLog("🔄 Using cached auth as fallback");
          setAuthState({
            user: cachedAuth.user as User,
            profile: cachedAuth.profile,
            loading: false,
            error: null,
            authMethod: cachedAuth.authMethod
          });
          return;
        }
      } catch (cacheError) {
        console.error("Cache fallback also failed:", cacheError);
      }
      setAuthState({
        user: null,
        loading: false,
        error: null,
        authMethod: null
      });
    }
  } else {
    devUsLog("ℹ️ No session token found");
    setAuthState({
      user: null,
      loading: false,
      error: null,
      authMethod: null
    });
  }
};

// Initialize session on app load
initializeSession();

// Listen for authentication state changes (Firebase)
onAuthStateChanged(auth, (user) => {





  if (user) {


  } else if (!googleCloudUser()) {
    // Only clear if no Google Cloud user and no session token
    const token = getCookie("ssgl_access_tkn");
    if (!token) {
      setAuthState({
        user: null,
        loading: false,
        error: null,
        authMethod: null
      });
    }
  }
});

// Check for redirect result on app load (Firebase)
getRedirectResult(auth)
  .then((result) => {
    if (result) {
      setAuthState({
        user: result.user,
        loading: false,
        error: null,
        authMethod: 'firebase'
      });
    }
  })
  .catch((error) => {
    console.error('Redirect sign-in error:', error);
    setAuthState({
      loading: false,
      error: error.message
    });
  });


  

export const authStore = {
  get state() {
    return authState;
  },


  async getUserProfile(userId: string) {

      let user : any = authStore?.state?.user;

        if (!user) {
          console.error("❌ Cannot create user profile: No authenticated user found");
          return null;
        }

        // Import statusAllList for initialization
        const { statusAllList } = await import('../modules/hbl/status/hblUpdateService');

        let newK = {
          uid: user?.uid,
          email: user?.email,
          displayName: user?.displayName,
          createdAt: new Date(),
          "stores":{
            "YY_8802":false,
            "YY_8803":false,
            "YY_8804":false,
            "YY_8805":false,
            "YY_8816":false,
            "YY_8818":false,
            "YY_8847":false,
            "YY_3251":false,
            "YY_32":false,
            "YY_76":false,
            "YY_2376":false,
            "YY_79":false,
            "YY_8635":false,
            "YY_8665":false,
            "YY_8901":false,
            "YY_3303":false,
            "YY_3329":false,
            "SS_42":false
          },
          "statusLocationPermissions": Object.fromEntries(
            statusAllList.map(status => [status.id, false])
          ),
          "businessId": "YB100423253156428",
          "AccountAccess":false,
          "BankingAccess":false,
          "InventoryAccess":false,
          "EmployeeAccess":false,
          "JournalAccess":false,
          "HBLAccess":false,
          "PassportAccess":false,
          "AdminPassportAccess":false,
          "HBLAccessManagement":false,
          "HBLScannerAccess":false,
          "NotaryAccess":false,
          "RemittanceAccess":false,
          "PurchaseRequestAccess":false,
          "offersManagementAccess":false,
          "inventoryDownsection":false,
          "onlyRead":false,
          "read_write":false,
          "invoiceAccess": false,
          "isAdmin": false
        }


          setTimeout(() => {
            authStore.initializeBusinessContext();
            authStore.loadStoresFromFirestore();
          }, 100);
          // Set the profile in auth state
          //setAuthState("profile", newK);

          return newK;
        
  },

  async getUserProfile2(userId: string) {
    devUsLog(`🔍 Fetching user profile for: ${userId}`);

    try {
      // Try API proxy first to avoid CORS issues
      const profileFromAPI = await firestoreProxy.getUserProfile(userId);

      if (profileFromAPI) {
        devUsLog(`✅ User profile loaded from API proxy for: ${userId}`);
        setAuthState("profile", profileFromAPI);
        return profileFromAPI;
      }

      // Fallback to direct Firestore (will work in production)
      devUsLog(`🔄 API proxy didn't return profile, trying direct Firestore for: ${userId}`);
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);
  
      if (userDocSnap.exists()) {
        devUsLog(`✅ User profile found in Firestore for: ${userId}`);
        setAuthState("profile", userDocSnap.data())

        // Import statusAllList for initialization of missing fields
        const { statusAllList } = await import('../modules/hbl/status/hblUpdateService');

        let nw: any = {
          "stores":{
             "YY_8802":false,
             "YY_8803":false,
             "YY_8804":false,
             "YY_8805":false,
             "YY_8816":false,
             "YY_8818":false,
             "YY_8847":false,
             "YY_3251":false,
             "YY_32":false,
             "YY_76":false,
            "YY_2376":false,
             "YY_79":false,
             "YY_8635":false,
             "YY_8665":false,
             "YY_8901":false
          },
        "statusLocationPermissions": Object.fromEntries(
          statusAllList.map(status => [status.id, false])
        ),
        "AccountAccess":false,
        "BankingAccess":false,
        "InventoryAccess":false,
        "EmployeeAccess":false,
        "JournalAccess":false,
        "HBLAccess":false,
        "HBLScannerAccess":false,
        "PassportAccess":false,
        "inventoryDownsection":false,
        "onlyRead":false,"read_write":false
       }


    
        let prof:any = userDocSnap.data();
       let nws:any = {}
       Object.keys(nw).map(ky=>{
        
        let v = nw?.[ky];
        if(!prof.hasOwnProperty(ky)){
          nws[ky] = v;
        }
       })
        

       if(Object.keys(nws).length>0){
        updateDoc(userDocRef, nws)
       }
       
        // Initialize business context after profile is loaded
        setTimeout(() => {
          authStore.initializeBusinessContext();
          authStore.loadStoresFromFirestore();
        }, 100);
        
        return userDocSnap.data();



      } else {
        // User document doesn't exist - create it
        devUsLog(`📝 Creating new user profile for ${userId}`);

        let user : User = authStore?.state?.user;

        if (!user) {
          console.error("❌ Cannot create user profile: No authenticated user found");
          return null;
        }

        // Import statusAllList for initialization
        const { statusAllList } = await import('../modules/hbl/status/hblUpdateService');

        let newK = {
          uid: user?.uid,
          email: user?.email,
          displayName: user?.displayName,
          createdAt: new Date(),
          "stores":{
            "YY_8802":false,
            "YY_8803":false,
            "YY_8804":false,
            "YY_8805":false,
            "YY_8816":false,
            "YY_8818":false,
            "YY_8847":false,
            "YY_3251":false,
            "YY_32":false,
            "YY_76":false,
            "YY_2376":false,
            "YY_79":false,
            "YY_8635":false,
            "YY_8665":false,
            "YY_8901":false,
            "YY_3303":false,
            "YY_3329":false,
            "SS_42":false
          },
          "statusLocationPermissions": Object.fromEntries(
            statusAllList.map(status => [status.id, false])
          ),
          "businessId": "YB100423253156428",
          "AccountAccess":false,
          "BankingAccess":false,
          "InventoryAccess":false,
          "EmployeeAccess":false,
          "JournalAccess":false,
          "HBLAccess":false,
          "PassportAccess":false,
          "AdminPassportAccess":false,
          "HBLAccessManagement":false,
          "HBLScannerAccess":false,
          "NotaryAccess":false,
          "RemittanceAccess":false,
          "PurchaseRequestAccess":false,
          "offersManagementAccess":false,
          "inventoryDownsection":false,
          "onlyRead":false,
          "read_write":false,
          "invoiceAccess": false,
          "isAdmin": false
        }

        try {
          await setDoc(userDocRef, newK);
          devUsLog("✅ User profile created successfully in Firestore!");
          devUsLog(`👤 User: ${user.email} (${userId})`);

          // Set the profile in auth state
          setAuthState("profile", newK);

          return newK;
        } catch (createError: any) {
          console.error("❌ FAILED to create user profile in Firestore:", createError);
          console.error("Error details:", {
            code: createError.code,
            message: createError.message,
            userId: userId,
            email: user.email
          });

          // Check if it's a permission error
          if (createError.code === 'permission-denied') {
            console.error("🔒 Firestore Security Rules are blocking user creation!");
            console.error("Please check your Firestore security rules allow writes to /users/{userId}");
          }

          return null;
        }
      }
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      
      // In development, if we get CORS errors, use mock data
      if (import.meta.env.DEV && (error.message?.includes('CORS') || error.message?.includes('Failed to fetch'))) {
        console.warn('Using mock permissions due to CORS error in development');
        const mockProfile = firestoreFallback.getMockData();
        setAuthState("profile", mockProfile);
        return mockProfile;
      }
      
      return null;
    }
  },

  // Reactive getter for businessId - returns the signal value
  getBusinessId : () => {
    const signalBusinessId = currentBusinessId();
    const profileBusinessId = authStore.state?.profile?.businessId || 'all';

    // If signal is still default 'all' and profile has a specific businessId, use profile
    if (signalBusinessId === 'all' && profileBusinessId !== 'all') {
      return profileBusinessId;
    }

    return signalBusinessId;
  },

  // Expose the raw signal for reactive subscriptions
  businessIdSignal: currentBusinessId,

  setBusinessId : (businessId: string) => {
    setCurrentBusinessId(businessId);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('hrmfinance-selected-business-id', businessId);
    }
    // Update filtered stores when business changes
    authStore.updateFilteredStores();
  },

  // Reactive getter for selected year - returns the signal value
  getSelectedYear : () : number => {
    return selectedYear();
  },

  // Expose the raw signal for reactive subscriptions
  selectedYearSignal: selectedYear,

  // Set selected year (updates both signal and localStorage)
  setSelectedYear : (year: number) => {
    setSelectedYear(year);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hrmfinance-selected-year', year.toString());
    }
  },
  
  getBusinessIds : () =>{
    const profile = authStore.state?.profile;
    if (!profile) return [];
    
    const businessIdsA =  profile.businessIds || [];
    const businessIds = [...businessIdsA];
    if (profile.businessId && !businessIds.includes(profile.businessId)) {
      businessIds.push(profile.businessId);
    }
    return businessIds;
  },
  
  hasBusinessAccess : (businessId: string) =>{
    const profile = authStore.state?.profile;
    
    if (!profile) return false;
    
    // Admin has access to all
    if (authStore?.isAdmin()) return true;
    
    // Check if 'all' access
    if (profile.businessId === 'all') return true;
    
    // Check specific business access
    if (profile.businessId === businessId) return true;
    
    // Check additional business IDs
    const businessIds = profile.businessIds || [];
    return businessIds.includes(businessId);
  },

  isAdmin : () =>{
    return authStore.state?.profile?.permissions?.isAdmin || authStore.state?.profile?.isAdmin;
  },
  profile : () =>{
    return authStore.state?.profile;
  },
  isOwner : (v:string) =>{
    return authStore.state?.user?.uid === v;
  },
  

  hasPermission :(permission: string) => {
    const profile = authStore.state?.profile;

    if(authStore?.isAdmin()) return true;
    if (!profile) return false;
    return profile?.permissions?.[permission] === true;
  },

  // ============================================
  // SPECIFIC PERMISSION HELPERS
  // ============================================

  // Tax Workflow Permissions
  hasTaxWorkflowAccess: () => authStore.hasPermission('taxWorkflowAccess'),
  hasTaxClientManagement: () => authStore.hasPermission('taxClientManagement'),
  hasTaxDocumentUpload: () => authStore.hasPermission('taxDocumentUpload'),
  hasTaxReviewApproval: () => authStore.hasPermission('taxReviewApproval'),
  hasDrakeExportAccess: () => authStore.hasPermission('drakeExportAccess'),
  hasTaxReportsAccess: () => authStore.hasPermission('taxReportsAccess'),

  // Check if user has ANY tax-related permission
  hasAnyTaxAccess: () => {
    return authStore.hasPermission('taxWorkflowAccess') ||
           authStore.hasPermission('taxClientManagement') ||
           authStore.hasPermission('taxDocumentUpload') ||
           authStore.hasPermission('taxReviewApproval') ||
           authStore.hasPermission('drakeExportAccess') ||
           authStore.hasPermission('taxReportsAccess');
  },

  // POS Permissions
  hasPosAccess: () => authStore.hasPermission('posAccess'),
  hasPosRefundAccess: () => authStore.hasPermission('posRefundAccess'),
  hasPosDiscountAccess: () => authStore.hasPermission('posDiscountAccess'),
  hasPosCashDrawerAccess: () => authStore.hasPermission('posCashDrawerAccess'),

  // Finance Permissions
  hasAccountAccess: () => authStore.hasPermission('AccountAccess'),
  hasBankingAccess: () => authStore.hasPermission('BankingAccess'),
  hasJournalAccess: () => authStore.hasPermission('JournalAccess'),
  hasInvoiceAccess: () => authStore.hasPermission('invoiceAccess'),
  hasRemittanceAccess: () => authStore.hasPermission('RemittanceAccess'),

  // Shipping Permissions
  hasHBLAccess: () => authStore.hasPermission('HBLAccess'),
  hasHBLManagementAccess: () => authStore.hasPermission('HBLAccessManagement'),
  hasHBLScannerAccess: () => authStore.hasPermission('HBLScannerAccess'),
  hasInternationalShippingAccess: () => authStore.hasPermission('internationalShippingAccess'),
  hasOffersManagementAccess: () => authStore.hasPermission('offersManagementAccess'),

  // Services Permissions
  hasPassportAccess: () => authStore.hasPermission('PassportAccess'),
  hasAdminPassportAccess: () => authStore.hasPermission('AdminPassportAccess'),
  hasNotaryAccess: () => authStore.hasPermission('NotaryAccess'),

  // Inventory Permissions
  hasInventoryAccess: () => authStore.hasPermission('InventoryAccess'),
  hasInventoryDownsection: () => authStore.hasPermission('inventoryDownsection'),
  hasPurchaseRequestAccess: () => authStore.hasPermission('PurchaseRequestAccess'),

  // Admin Permissions
  hasEmployeeAccess: () => authStore.hasPermission('EmployeeAccess'),
  hasUserManagementAccess: () => authStore.hasPermission('userManagementAccess'),
  hasStoreManagementAccess: () => authStore.hasPermission('storeManagementAccess'),
  hasReportsAccess: () => authStore.hasPermission('reportsAccess'),
  hasAuditLogAccess: () => authStore.hasPermission('auditLogAccess'),

  // Core Permissions
  isReadOnly: () => authStore.hasPermission('onlyRead'),
  hasReadWrite: () => authStore.hasPermission('read_write'),

  // Check if user has access to a specific store
  hasStoreAccess : (storeId: string) => {
    const profile = authStore.state?.profile;
    if (!profile) return false;
    if (authStore?.isAdmin()) return true;
    return profile.stores?.[storeId] === true;
  },

  // Check if user has permission to update to a specific status location
  hasStatusLocationPermission : (statusId: string) => {
    const profile = authStore.state?.profile;
    if (!profile) return false;

    // Check if user is admin (either at root level or in permissions)
    if (authStore?.isAdmin() || profile.permissions?.isAdmin) return true;

    // Check statusLocationPermissions at root level first, then in permissions
    const statusPerms = profile.statusLocationPermissions || profile.permissions?.statusLocationPermissions;
    return statusPerms?.[statusId] === true;
  },

  // Get list of status location IDs that the user has permission to update
  getAllowedStatusLocations : () => {
    const profile = authStore.state?.profile;
    if (!profile) return [];

    // Check if user is admin (either at root level or in permissions)
    if (authStore?.isAdmin() || profile.permissions?.isAdmin) {
      // Admin has access to all status locations, return empty array to indicate no filtering needed
      return [];
    }

    const allowedStatusLocations: string[] = [];

    // Check statusLocationPermissions at root level first
    const statusPerms = profile.statusLocationPermissions || profile.permissions?.statusLocationPermissions;

    if (statusPerms) {
      Object.keys(statusPerms).forEach(statusId => {
        if (statusPerms[statusId] === true) {
          allowedStatusLocations.push(statusId);
        }
      });
    }
    return allowedStatusLocations;
  },

  // Filter status locations based on user permissions
  filterAllowedStatusLocations : (statusList: Array<{id: string, label: string}>) => {
    const profile = authStore.state?.profile;
    if (!profile) return [];

    // Check if user is admin (either at root level or in permissions)
    if (authStore?.isAdmin() || profile.permissions?.isAdmin) return statusList;

    const allowedStatusLocationIds = authStore.getAllowedStatusLocations();

    // If no allowed locations found, return empty (user has no permissions)
    // This handles the case where statusLocationPermissions doesn't exist
    if (allowedStatusLocationIds.length === 0) {
      devUsLog('No statusLocationPermissions found for user, returning empty list');
      return [];
    }

    devUsLog(allowedStatusLocationIds)
    return statusList.filter(status => allowedStatusLocationIds.includes(status.id));
  },

  // Get list of store IDs that the user has access to
  getAllowedStoreIds : () => {
    const profile = authStore.state?.profile;
    if (!profile) return [];
    if (authStore?.isAdmin()) return []; // Admin has access to all stores, return empty array to indicate no filtering needed
    
    const allowedStoreIds: string[] = [];
    if (profile.stores) {
      Object.keys(profile.stores).forEach(storeId => {
        if (profile.stores[storeId] === true) {
          allowedStoreIds.push(storeId);
        }
      });
    }
    return allowedStoreIds;
  },

  // Filter stores based on user permissions
  filterAllowedStores : (stores: Array<{id: string, name: string}>) => {
    const profile = authStore.state?.profile;
    if (!profile) return [];
    if (authStore?.isAdmin()) return stores; // Admin sees all stores
    
    const allowedStoreIds = authStore.getAllowedStoreIds();
    return stores.filter(store => allowedStoreIds.includes(store.id));
  },
  
  // Global store management
  get stores() {
    return availableStores();
  },
  
  get allowedStores() {
    return filteredStores();
  },
  
  // Load and manage stores globally (API only)
  async loadStoresFromFirestore(): Promise<void> {
    try {
      const profile = authStore.state?.profile;
      let storesList: StoreInfo[] = [];

      const apiStores = await storesApi.getActiveStores();
      if (apiStores && apiStores.length > 0) {
        storesList = apiStores
          .filter((store: any) => !profile || authStore?.isAdmin() || profile.stores?.[store.id])
          .map((store: any) => ({
            id: store.id,
            name: store.name,
            code: store.code,
            type: store.type,
            isActive: store.isActive !== false
          }));
      }

      setAvailableStores(storesList);
      authStore.updateFilteredStores();
    } catch (error) {
      console.error('Error loading stores from API:', error);
      setAvailableStores([]);
      authStore.updateFilteredStores();
    }
  },
  
  // Update filtered stores based on current user permissions
  updateFilteredStores : () => {
    const stores = availableStores();
    const filtered = authStore.filterAllowedStores(stores);
    setFilteredStores(filtered);
  },
  
  // Initialize default business ID when user profile loads
  initializeBusinessContext : () => {
    const profile = authStore.state?.profile;
    if (profile?.businessId && currentBusinessId() === 'all') {
      setCurrentBusinessId(profile.businessId);
    }
  },

  // Load businesses from API
  async loadBusinesses(): Promise<Array<{id: string, name: string, isActive: boolean}>> {
    try {
      const apiBusinesses = await businessApi.getBusinessByStatus(true);
      if (apiBusinesses && apiBusinesses.length > 0) {
        return apiBusinesses.map((b: any) => ({
          id: b.id,
          name: b.name,
          isActive: b.isActive !== false
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading businesses from API:', error);
      return [];
    }
  },

  // Get available businesses based on user permissions
  async getAvailableBusinesses(): Promise<Array<{id: string, name: string}>> {
    const businesses = await authStore.loadBusinesses();
    const profile = authStore.state?.profile;
    
    if (!profile) return [];
    
    if (authStore?.isAdmin()) {
      // Admins see all active businesses
      return businesses.filter(b => b.isActive).map(b => ({ id: b.id, name: b.name }));
    }
    
    // Regular users see only their assigned businesses
    const userBusinessIds = authStore.getBusinessIds();
    return businesses
      .filter(b => b.isActive && userBusinessIds.includes(b.id))
      .map(b => ({ id: b.id, name: b.name }));
  },
  
  // Business switching with store context update
  async switchBusiness(businessId: string, reloadPage: boolean = true): Promise<void> {
    authStore.setBusinessId(businessId);
    
    // Reload stores for the new business context
    await authStore.loadStoresFromFirestore();
    
    // Optionally reload the page to ensure clean state
    if (reloadPage) {
      window.location.reload();
    }
  },
  
  // Firebase Google Sign-In
  async signInWithFbGoogle() {
    try {
      setAuthState('loading', true);
      setAuthState('error', null);
      
      // Try popup first, fallback to redirect if blocked
      try {
        const result = await signInWithPopup(auth, googleProvider);
        setAuthState({
          user: result.user,
          loading: false,
          error: null,
          authMethod: 'firebase'
        });
        
     

       try{
        
         // await authStore.getUserProfile(result.user.uid);
          
          // Initialize business context and load stores after profile is loaded
          setTimeout(() => {
            authStore.initializeBusinessContext();
            authStore.loadStoresFromFirestore();
          }, 100);
        }
        catch (popupError: any) {
          console.error('firestore error:', popupError);
        }



      } catch (popupError: any) {
        // If popup blocked, use redirect
        if (popupError.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, googleProvider);
        } else {
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error('Sign-in error:', error);
      setAuthState({
        loading: false,
        error: error.message || 'Failed to sign in with Google'
      });
    }
  },

  // Google Cloud Sign-In
  async signInWithGoogleP(credential: string) {

   
    let Qry = {
      params:{
        id_token: credential
      },
      query:"getGoogleUserbyToken"
    };

    const td = await fetchGraphQL( Qry);
  
    if (td && td) {
      let _now = new Date().getTime();
      let _expire = new Date(_now + 60000 * 60 * 24 * 365);
      let ckNm = "hrm_tkn_acc";
      //document.cookie = `${ckNm}=${td.data}; expires=${_expire}; path=/;g_state = {"i_l":1,"i_p":${_expire}}; ssgl_access_tkn = ${credential}`;
      //document.cookie = `ssgl_access_tkn = ${credential}; expires=${_expire};`;
    
      await initQry();
     // validateTkn(td.data);
    }

  },
  // Google Cloud Sign-In
  async signInWithGoogleCloud(credential: string) {
    try {
      setAuthState('loading', true);
      setAuthState('error', null);
      
     
      // Decode the JWT token to get user info
      const decodedUser = decodeGoogleToken(credential);
      // devUsLog(decodedUser)
      
      // Create a user object compatible with Firebase User interface
      const googleUser: GoogleCloudUser = {
        uid: decodedUser.sub,
        email: decodedUser.email,
        displayName: decodedUser.name,
        photoURL: decodedUser.picture
      };
      
      // Store Google Cloud user
      setGoogleCloudUser(googleUser);
      
      // Create a minimal user object for compatibility
      const user = {
        uid: googleUser.uid,
        email: googleUser.email,
        displayName: googleUser.displayName,
        photoURL: googleUser.photoURL,
        emailVerified: true,
        // Add other required User properties as needed
      } as User;
      
      setAuthState({
        user,
        loading: false,
        error: null,
        authMethod: 'google-cloud'
      });
      
      // Initialize business context and load stores
      setTimeout(() => {
        authStore.initializeBusinessContext();
        authStore.loadStoresFromFirestore();
      }, 100);
      
      // Optionally, you can also sign in to Firebase with the Google credential
      // This allows you to use Firebase services with the Google Cloud auth
      try {
        const firebaseCredential = GoogleAuthProvider.credential(credential);
        await signInWithCredential(auth, firebaseCredential);
      } catch (firebaseError) {
        devUsLog('Firebase sign-in optional, continuing with Google Cloud auth');
      }
      
    } catch (error: any) {
      console.error('Google Cloud sign-in error:', error);
      setAuthState({
        loading: false,
        error: error.message || 'Failed to sign in with Google Cloud'
      });
    }
  },


  updateAuthState(obj:any):any {
      setAuthState(obj);
  },
  // Magic Link Sign-In
  async signInWithMagicLink(magicLinkUser: {
    uid: string;
    email: string;
    displayName: string | null;
    emailVerified: boolean;
  }, sessionToken?: string) {
    try {
      setAuthState('loading', true);
      setAuthState('error', null);

      // If session token provided, save it to cookie
      if (sessionToken) {
        const now = new Date().getTime();
        const expire = new Date(now + 60000 * 60 * 24 * 365); // 1 year
        //document.cookie = `ssgl_access_tkn=${sessionToken}; expires=${expire.toUTCString()}; path=/`;
        devUsLog('✅ Magic Link session token saved to cookie');
      }

      // Create a user object compatible with Firebase User interface
      const user = {
        uid: magicLinkUser.uid,
        email: magicLinkUser.email,
        displayName: magicLinkUser.displayName,
        photoURL: null,
        emailVerified: magicLinkUser.emailVerified,
        // Add other required User properties
      } as User;

      setAuthState({
        user,
        loading: false,
        error: null,
        authMethod: 'magic-link'
      });

      // Load user profile if exists
      try {
        //await authStore.getUserProfile(user.uid);

        // Initialize business context and load stores after profile is loaded
        setTimeout(() => {
         // authStore.initializeBusinessContext();
         // authStore.loadStoresFromFirestore();
        }, 100);
      } catch (profileError) {
        console.error('Profile loading error (non-critical):', profileError);
        // Continue even if profile loading fails
      }

    } catch (error: any) {
      console.error('Magic Link sign-in error:', error);
      setAuthState({
        loading: false,
        error: error.message || 'Failed to sign in with Magic Link'
      });
      throw error;
    }
  },

  // Validate magic link session from cookie
  async validateMagicLinkSession(): Promise<boolean> {
    try {
      // Import dynamically to avoid circular dependency
      const { default: MagicLinkService } = await import('../services/magicLinkService');

      const sessionToken = MagicLinkService.getSessionToken();
      if (!sessionToken) {
        return false;
      }

      devUsLog('🔍 Validating magic link session token...');
      const result = await MagicLinkService.validateSessionToken(sessionToken);

      if (result.success && result.user) {
        devUsLog('✅ Magic link session valid, signing in user');
        await authStore.signInWithMagicLink(result.user, result.token);
        return true;
      } else {
        devUsLog('❌ Magic link session invalid or expired');
        MagicLinkService.clearSessionToken();
        return false;
      }
    } catch (error) {
      console.error('Error validating magic link session:', error);
      return false;
    }
  },

  async signOut() {
    try {
      setAuthState('loading', true);

      // Sign out from Firebase
      if (authState.authMethod === 'firebase' || auth.currentUser) {
        await signOut(auth);
      }

      // Sign out from Google Cloud
      if (authState.authMethod === 'google-cloud') {
        googleSignOut();
        setGoogleCloudUser(null);
      }

      // Clear Magic Link session
      if (authState.authMethod === 'magic-link') {
        // Import dynamically to avoid circular dependency
        const { default: MagicLinkService } = await import('../services/magicLinkService');
        MagicLinkService.clearSessionToken();
        localStorage.removeItem('magiclink_session');
      }

      // Clear offline auth cache
      try {
        await clearCachedAuthState();
      } catch (cacheError) {
        console.warn('Failed to clear cached auth state:', cacheError);
      }

      // Also clear session token cookie for all auth methods
      document.cookie = 'ssgl_access_tkn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
      devUsLog("✅ Session cookie cleared");

      setAuthState({
        user: null,
        profile: null,
        loading: false,
        error: null,
        authMethod: null
      });
    } catch (error: any) {
      console.error('Sign-out error:', error);
      setAuthState({
        loading: false,
        error: error.message || 'Failed to sign out'
      });
    }
  },

  get isAuthenticated() {
    return !!authState.user || !!googleCloudUser();
  },

  get currentUser() {
    return authState.user;
  },

  get authMethod() {
    return authState.authMethod;
  }
};





