import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

/**
 * Authentication state store
 *
 * Manages the current user's authentication state including:
 * - Firebase user object (null if guest)
 * - Current userId (either Firebase UID or guest ID)
 * - Guest status flag
 * - Loading state during auth initialization
 */
interface AuthState {
  /** Firebase user object, null if guest or not initialized */
  user: FirebaseAuthTypes.User | null;

  /** Current user ID - either Firebase UID or guest ID */
  userId: string;

  /** Whether the current user is a guest (not signed in) */
  isGuest: boolean;

  /** Whether auth state is still being determined */
  isLoading: boolean;

  /** Whether the user's email is verified (true for guests and social logins) */
  isEmailVerified: boolean;

  /** Set the Firebase user */
  setUser: (user: FirebaseAuthTypes.User | null) => void;

  /** Set the current user ID */
  setUserId: (userId: string) => void;

  /** Set guest status */
  setIsGuest: (isGuest: boolean) => void;

  /** Set loading state */
  setIsLoading: (isLoading: boolean) => void;

  /** Reset auth state (on sign out) */
  reset: () => void;
}

const initialState = {
  user: null,
  userId: '',
  isGuest: true,
  isLoading: true,
  isEmailVerified: true,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setUser: (user) =>
    set({
      user,
      isEmailVerified: user ? user.emailVerified || !user.email : true,
    }),

  setUserId: (userId) => set({ userId }),

  setIsGuest: (isGuest) => set({ isGuest }),

  setIsLoading: (isLoading) => set({ isLoading }),

  reset: () => set(initialState),
}));

/**
 * Selector hooks for common auth state access patterns
 */
export const useUserId = () => useAuthStore((s) => s.userId);
export const useIsGuest = () => useAuthStore((s) => s.isGuest);
export const useIsAuthLoading = () => useAuthStore((s) => s.isLoading);
export const useFirebaseUser = () => useAuthStore((s) => s.user);
export const useIsEmailVerified = () => useAuthStore((s) => s.isEmailVerified);
