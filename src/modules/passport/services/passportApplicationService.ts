import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  doc, 
  getDoc,
  DocumentSnapshot 
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { authStore } from '../../../stores/authStore';
import { CubanPassportForm } from '../types/cubanPassport';
import { fetchGraphQLSS, devLog } from '../../../services/utils';

export interface SavedPassportApplication {
  id: string;
  applicationData: CubanPassportForm;
  createdAt: any;
  updatedAt: any;
  status: 'draft' | 'submitted' | 'processing' | 'completed' | 'rejected';
  userId: string;
  applicationNumber?: string;
  submissionDate?: string;
  processingNotes?: string;
}

export interface PassportApplicationsResult {
  applications: SavedPassportApplication[];
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
  total: number;
}

export interface PassportApplicationFilters {
  status?: 'draft' | 'submitted' | 'processing' | 'completed' | 'rejected' | 'all';
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  startAfter?: DocumentSnapshot;
}

/**
 * Fetch saved passport applications for the current user
 */
export const fetchPassportApplications = async (
  filters: PassportApplicationFilters = {}
): Promise<SavedPassportApplication[]> => {
  try {
    const currentUser = authStore.state.user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }


    
    const {
      status = 'all',
      searchTerm = '',
      dateFrom,
      dateTo,
      limit: pageLimit = 20,
      startAfter: startAfterDoc
    } = filters;
    

    // Build the base query
    //const applicationsRef = collection(db, 'passportApplications');
    let constraints: any[] = [
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    ];

    // Add status filter
    if (status !== 'all') {
      constraints.splice(1, 0, where('status', '==', status));
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      if (dateFrom) {
        constraints.splice(-1, 0, where('createdAt', '>=', new Date(dateFrom)));
      }
      if (dateTo) {
        constraints.splice(-1, 0, where('createdAt', '<=', new Date(dateTo)));
      }
    }





    // Add pagination
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }
    
    constraints.push(limit(pageLimit + 1)); // Get one extra to check if there are more


 
    
      if(!(searchTerm && searchTerm?.trim())){
        return []
      } 
    
      let  params: Record<string, any> = {
        businessId: authStore.getBusinessId(),
      }

     
    
    
    
      searchTerm && searchTerm.split(" ").map((qry,inDq)=>{
        if(qry){
            params[":search"+inDq] = qry.trim();
        }
      })

      

      let bdyq2 = {
        query: "getCubanPassport",
        queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND guia = guia",
        params
      } 
    
        const response = await fetchGraphQLSS(bdyq2);
        devLog(response);
       return response;
   


      

  } catch (error) {
    devLog('Error fetching passport applications:', error);
    throw new Error(`Failed to fetch passport applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get a specific passport application by ID
 */
export const getPassportApplicationById = async (
  applicationId: string
): Promise<SavedPassportApplication | null> => {
  try {
    const currentUser = authStore.state.user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const docRef = doc(db, 'passportApplications', applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    
    // Verify the application belongs to the current user
    if (data.userId !== currentUser.uid) {
      throw new Error('Unauthorized access to passport application');
    }

    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as SavedPassportApplication;

  } catch (error) {
    devLog('Error fetching passport application:', error);
    throw new Error(`Failed to fetch passport application: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Delete a passport application
 */
export const deletePassportApplication = async (applicationId: string): Promise<void> => {
  try {
    const currentUser = authStore.state.user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // First verify ownership
    const application = await getPassportApplicationById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.userId !== currentUser.uid) {
      throw new Error('Unauthorized to delete this application');
    }

    const docRef = doc(db, 'passportApplications', applicationId);
    await docRef.delete();

  } catch (error) {
    devLog('Error deleting passport application:', error);
    throw new Error(`Failed to delete passport application: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get application status statistics for the current user
 */
export const getApplicationStats = async (): Promise<Record<string, number>> => {
  try {
    const currentUser = authStore.state.user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const stats = {
      draft: 0,
      submitted: 0,
      processing: 0,
      completed: 0,
      rejected: 0,
      total: 0
    };

    const applicationsRef = collection(db, 'passportApplications');
    const q = query(
      applicationsRef,
      where('userId', '==', currentUser.uid)
    );
    
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const status = data.status || 'draft';
      if (status in stats) {
        stats[status as keyof typeof stats]++;
      }
      stats.total++;
    });

    return stats;

  } catch (error) {
    devLog('Error fetching application stats:', error);
    return {
      draft: 0,
      submitted: 0, 
      processing: 0,
      completed: 0,
      rejected: 0,
      total: 0
    };
  }
};