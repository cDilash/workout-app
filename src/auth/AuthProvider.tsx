import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import { useAuthStore } from './authStore';
import { getOrCreateGuestId } from './guestService';
import { initializeFirebaseAuth, onAuthStateChanged, isFirebaseAvailable } from './authService';

/**
 * Auth Context Type
 *
 * Provides access to authentication state throughout the app.
 * All components can use useAuth() to check login status and get the current userId.
 */
interface AuthContextType {
  /** Firebase user object, null if guest */
  user: any | null;

  /** Current user ID - either Firebase UID or guest ID */
  userId: string;

  /** Whether the current user is a guest (not signed in) */
  isGuest: boolean;

  /** Whether auth state is still being determined */
  isLoading: boolean;

  /** Whether the user's email is verified */
  isEmailVerified: boolean;

  /** Whether Firebase is available (false in Expo Go) */
  isFirebaseAvailable: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Hook to access authentication state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { userId, isGuest } = useAuth();
 *
 *   if (isGuest) {
 *     return <GuestPrompt />;
 *   }
 *
 *   return <UserContent userId={userId} />;
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider
 *
 * Wraps the app and manages authentication state.
 * Listens to Firebase auth state changes and falls back to guest ID
 * when no Firebase user is signed in.
 *
 * NOTE: In Expo Go, Firebase won't be available and users will always
 * be in guest mode. Use a development build for full auth support.
 *
 * @example
 * ```tsx
 * // In app/_layout.tsx
 * export default function RootLayout() {
 *   return (
 *     <AuthProvider>
 *       <DatabaseProvider>
 *         <App />
 *       </DatabaseProvider>
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseReady, setFirebaseReady] = useState(false);

  const {
    setUser,
    setUserId,
    setIsGuest,
    setIsLoading,
  } = useAuthStore();

  // Initialize Firebase on mount
  useEffect(() => {
    async function init() {
      // Try to initialize Firebase (will fail gracefully in Expo Go)
      await initializeFirebaseAuth();
      setFirebaseReady(true);
    }
    init();
  }, []);

  // Subscribe to auth state once Firebase is ready (or confirmed unavailable)
  useEffect(() => {
    if (!firebaseReady) return;

    // Subscribe to Firebase auth state changes
    // If Firebase isn't available, this will immediately call with null
    const unsubscribe = onAuthStateChanged(async (firebaseUser: any) => {
      if (firebaseUser) {
        // User is signed in with Firebase
        setUser(firebaseUser);
        setUserId(firebaseUser.uid);
        setIsGuest(false);
      } else {
        // No Firebase user - use guest ID
        const guestId = await getOrCreateGuestId();
        setUser(null);
        setUserId(guestId);
        setIsGuest(true);
      }

      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [firebaseReady, setUser, setUserId, setIsGuest, setIsLoading]);

  // Get current state from store
  const user = useAuthStore((s) => s.user);
  const userId = useAuthStore((s) => s.userId);
  const isGuest = useAuthStore((s) => s.isGuest);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isEmailVerified = useAuthStore((s) => s.isEmailVerified);

  const value: AuthContextType = {
    user,
    userId,
    isGuest,
    isLoading,
    isEmailVerified,
    isFirebaseAvailable,
  };

  // Don't render children until auth state is determined
  // This prevents flash of wrong content
  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * HOC to require authentication for a component
 * Redirects to sign-in if user is a guest
 *
 * @deprecated Use soft prompts instead of hard redirects for guest-first UX
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> {
  return function WithAuthComponent(props: P) {
    const { isGuest } = useAuth();

    if (isGuest) {
      // For guest-first UX, we don't redirect
      // Instead, components should show appropriate prompts
      return <WrappedComponent {...props} />;
    }

    return <WrappedComponent {...props} />;
  };
}
