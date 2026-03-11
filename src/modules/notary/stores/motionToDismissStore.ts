import { createSignal } from 'solid-js';
import type { MotionToDismissData, getEmptyMotionData } from '../types/motionToDismiss';
import { getEmptyMotionData as createEmptyMotion } from '../types/motionToDismiss';
import { devLog } from '../../../services/utils';

// Storage key for localStorage
const STORAGE_KEY = 'notary_motions_to_dismiss';

// Generate unique ID for motions
const generateMotionId = (): string => {
  return `motion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Load motions from localStorage
const loadMotionsFromStorage = (): MotionToDismissData[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp fields back to numbers if needed
      return parsed.map((motion: any) => ({
        ...motion,
        createdAt: typeof motion.createdAt === 'string' ? new Date(motion.createdAt).getTime() : motion.createdAt,
        updatedAt: typeof motion.updatedAt === 'string' ? new Date(motion.updatedAt).getTime() : motion.updatedAt,
        respondent: {
          ...motion.respondent,
          dateOfBirth: typeof motion.respondent.dateOfBirth === 'string'
            ? new Date(motion.respondent.dateOfBirth).getTime()
            : motion.respondent.dateOfBirth
        },
        nextHearingDate: motion.nextHearingDate && typeof motion.nextHearingDate === 'string'
          ? new Date(motion.nextHearingDate).getTime()
          : motion.nextHearingDate,
        caaDetails: motion.caaDetails ? {
          ...motion.caaDetails,
          i485FiledDate: typeof motion.caaDetails.i485FiledDate === 'string'
            ? new Date(motion.caaDetails.i485FiledDate).getTime()
            : motion.caaDetails.i485FiledDate,
          i485ApprovalDate: motion.caaDetails.i485ApprovalDate && typeof motion.caaDetails.i485ApprovalDate === 'string'
            ? new Date(motion.caaDetails.i485ApprovalDate).getTime()
            : motion.caaDetails.i485ApprovalDate
        } : undefined,
        lprDetails: motion.lprDetails ? {
          ...motion.lprDetails,
          lprGrantDate: typeof motion.lprDetails.lprGrantDate === 'string'
            ? new Date(motion.lprDetails.lprGrantDate).getTime()
            : motion.lprDetails.lprGrantDate
        } : undefined,
        certificateOfService: {
          ...motion.certificateOfService,
          serviceDate: typeof motion.certificateOfService.serviceDate === 'string'
            ? new Date(motion.certificateOfService.serviceDate).getTime()
            : motion.certificateOfService.serviceDate
        }
      }));
    }
  } catch (error) {
    devLog('Failed to load motions from storage:', error);
  }
  return [];
};

// Save motions to localStorage
const saveMotionsToStorage = (motions: MotionToDismissData[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(motions));
  } catch (error) {
    devLog('Failed to save motions to storage:', error);
  }
};

// Global signals for store state
const [motions, setMotions] = createSignal<MotionToDismissData[]>(loadMotionsFromStorage());
const [currentMotion, setCurrentMotion] = createSignal<Partial<MotionToDismissData> | null>(null);
const [loading, setLoading] = createSignal<boolean>(false);
const [error, setError] = createSignal<string | null>(null);

// Export the motion to dismiss store
export const motionToDismissStore = {
  // Getters
  get motions() {
    return motions();
  },

  get currentMotion() {
    return currentMotion();
  },

  get loading() {
    return loading();
  },

  get error() {
    return error();
  },

  // Load motions from storage
  loadMotions: (): void => {
    try {
      setLoading(true);
      setError(null);
      const loadedMotions = loadMotionsFromStorage();
      setMotions(loadedMotions);
    } catch (err: any) {
      devLog('Error loading motions:', err);
      setError(err.message || 'Failed to load motions');
    } finally {
      setLoading(false);
    }
  },

  // Save a new motion or update existing one
  saveMotion: (motion: Partial<MotionToDismissData>): MotionToDismissData => {
    try {
      setLoading(true);
      setError(null);

      const now = Date.now();

      // If motion has an ID, update it; otherwise create new
      if (motion.id) {
        const existingIndex = motions().findIndex(m => m.id === motion.id);
        if (existingIndex !== -1) {
          // Update existing motion
          const updatedMotion: MotionToDismissData = {
            ...motions()[existingIndex],
            ...motion,
            updatedAt: now
          } as MotionToDismissData;

          setMotions(prev => {
            const updated = [...prev];
            updated[existingIndex] = updatedMotion;
            saveMotionsToStorage(updated);
            return updated;
          });

          return updatedMotion;
        }
      }

      // Create new motion
      const newMotion: MotionToDismissData = {
        ...motion,
        id: generateMotionId(),
        createdAt: now,
        updatedAt: now
      } as MotionToDismissData;

      setMotions(prev => {
        const updated = [...prev, newMotion];
        saveMotionsToStorage(updated);
        return updated;
      });

      return newMotion;
    } catch (err: any) {
      devLog('Error saving motion:', err);
      setError(err.message || 'Failed to save motion');
      throw err;
    } finally {
      setLoading(false);
    }
  },

  // Update an existing motion
  updateMotion: (id: string, updates: Partial<MotionToDismissData>): void => {
    try {
      setLoading(true);
      setError(null);

      setMotions(prev => {
        const updated = prev.map(motion => {
          if (motion.id === id) {
            return {
              ...motion,
              ...updates,
              updatedAt: Date.now()
            };
          }
          return motion;
        });
        saveMotionsToStorage(updated);
        return updated;
      });

      // Update current motion if it's the one being updated
      if (currentMotion()?.id === id) {
        setCurrentMotion(prev => ({
          ...prev,
          ...updates,
          updatedAt: Date.now()
        }));
      }
    } catch (err: any) {
      devLog('Error updating motion:', err);
      setError(err.message || 'Failed to update motion');
      throw err;
    } finally {
      setLoading(false);
    }
  },

  // Delete a motion
  deleteMotion: (id: string): void => {
    try {
      setLoading(true);
      setError(null);

      setMotions(prev => {
        const updated = prev.filter(motion => motion.id !== id);
        saveMotionsToStorage(updated);
        return updated;
      });

      // Clear current motion if it's the one being deleted
      if (currentMotion()?.id === id) {
        setCurrentMotion(null);
      }
    } catch (err: any) {
      devLog('Error deleting motion:', err);
      setError(err.message || 'Failed to delete motion');
      throw err;
    } finally {
      setLoading(false);
    }
  },

  // Set current motion for editing
  setCurrentMotion: (motion: Partial<MotionToDismissData> | null): void => {
    setCurrentMotion(motion);
  },

  // Clear current motion
  clearCurrentMotion: (): void => {
    setCurrentMotion(null);
  },

  // Create new empty motion
  createNewMotion: (): void => {
    const emptyMotion = createEmptyMotion();
    setCurrentMotion(emptyMotion);
  },

  // Get motion by ID
  getMotionById: (id: string): MotionToDismissData | undefined => {
    return motions().find(motion => motion.id === id);
  },

  // Get motions by status
  getMotionsByStatus: (status: 'draft' | 'completed' | 'filed'): MotionToDismissData[] => {
    return motions().filter(motion => motion.status === status);
  },

  // Get motions sorted by most recent
  getMotionsSorted: (): MotionToDismissData[] => {
    return [...motions()].sort((a, b) => b.updatedAt - a.updatedAt);
  },

  // Search motions by A-Number, respondent name, or case info
  searchMotions: (query: string): MotionToDismissData[] => {
    const lowerQuery = query.toLowerCase();
    return motions().filter(motion => {
      const respondentName = `${motion.respondent.firstName} ${motion.respondent.lastName}`.toLowerCase();
      const aNumber = motion.aNumber?.toLowerCase() || '';
      const courtLocation = motion.courtLocation?.toLowerCase() || '';
      const judgeName = motion.judgeName?.toLowerCase() || '';

      return (
        respondentName.includes(lowerQuery) ||
        aNumber.includes(lowerQuery) ||
        courtLocation.includes(lowerQuery) ||
        judgeName.includes(lowerQuery)
      );
    });
  },

  // Clear all motions
  clearAllMotions: (): void => {
    setMotions([]);
    localStorage.removeItem(STORAGE_KEY);
    setCurrentMotion(null);
  },

  // Get count of motions
  getCount: (): number => {
    return motions().length;
  },

  // Get count by status
  getCountByStatus: (status: 'draft' | 'completed' | 'filed'): number => {
    return motions().filter(motion => motion.status === status).length;
  }
};
