// Auth Provider and Context
export { AuthProvider, useAuth, withAuth } from './AuthProvider';

// Auth Store
export {
  useAuthStore,
  useUserId,
  useIsGuest,
  useIsAuthLoading,
  useFirebaseUser,
  useIsEmailVerified,
} from './authStore';

// Auth Service (sign in/out operations)
export {
  configureGoogleSignIn,
  signUpWithEmail,
  signInWithEmail,
  signInWithApple,
  signInWithGoogle,
  signOut,
  sendEmailVerification,
  sendPasswordReset,
  reloadUser,
  getAuthErrorMessage,
} from './authService';

// Guest Service
export {
  getOrCreateGuestId,
  getGuestId,
  clearGuestId,
  isGuestId,
} from './guestService';

// Data Migration Service
export {
  hasGuestData,
  getGuestDataStats,
  migrateGuestDataToAccount,
  deleteGuestData,
  createFreshProfile,
} from './dataMigrationService';
