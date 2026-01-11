import * as Crypto from 'expo-crypto';

/**
 * Firebase Authentication Service
 *
 * Handles all authentication operations including:
 * - Email/Password sign up and sign in
 * - Sign in with Apple
 * - Sign in with Google
 * - Email verification
 * - Password reset
 * - Sign out
 *
 * NOTE: Firebase requires native code and won't work in Expo Go.
 * Run `npx expo prebuild` and use a development build for full auth.
 */

// Lazy imports for native modules (prevents crash in Expo Go)
let auth: any = null;
let AppleAuthentication: any = null;
let GoogleSignin: any = null;

// Flag to track if Firebase is available
export let isFirebaseAvailable = false;

// Initialize Firebase modules (call this on app startup)
export async function initializeFirebaseAuth(): Promise<boolean> {
  try {
    // Dynamic imports to prevent crash when modules aren't available
    const firebaseAuth = await import('@react-native-firebase/auth');
    auth = firebaseAuth.default;

    const appleAuth = await import('expo-apple-authentication');
    AppleAuthentication = appleAuth;

    const googleSignin = await import('@react-native-google-signin/google-signin');
    GoogleSignin = googleSignin.GoogleSignin;

    isFirebaseAvailable = true;
    console.log('Firebase Auth initialized successfully');
    return true;
  } catch (error) {
    console.log('Firebase Auth not available (running in Expo Go?) - Guest mode only');
    isFirebaseAvailable = false;
    return false;
  }
}

// Configure Google Sign-In (call this once on app startup)
export function configureGoogleSignIn(webClientId: string) {
  if (!GoogleSignin) {
    console.warn('Google Sign-In not available');
    return;
  }
  GoogleSignin.configure({
    webClientId,
    offlineAccess: true,
  });
}

/**
 * Check if auth is available, throw helpful error if not
 */
function requireAuth() {
  if (!auth) {
    throw new Error('Firebase is not available. Please use a development build instead of Expo Go.');
  }
}

/**
 * Sign up with email and password
 * Automatically sends email verification
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ user: any; isNewUser: boolean }> {
  requireAuth();

  const trimmedEmail = email.trim().toLowerCase();

  // Validate email format
  if (!isValidEmail(trimmedEmail)) {
    throw new Error('Please enter a valid email address');
  }

  // Validate password strength
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const userCredential = await auth().createUserWithEmailAndPassword(
    trimmedEmail,
    password
  );

  // Send email verification
  await userCredential.user.sendEmailVerification();

  return {
    user: userCredential.user,
    isNewUser: true,
  };
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: any; isNewUser: boolean }> {
  requireAuth();

  const trimmedEmail = email.trim().toLowerCase();

  const userCredential = await auth().signInWithEmailAndPassword(
    trimmedEmail,
    password
  );

  return {
    user: userCredential.user,
    isNewUser: false,
  };
}

/**
 * Sign in with Apple
 * Required for iOS apps that offer social sign-in
 */
export async function signInWithApple(): Promise<{
  user: any;
  isNewUser: boolean;
}> {
  requireAuth();

  if (!AppleAuthentication) {
    throw new Error('Apple Sign-In is not available');
  }

  // Check if Apple Authentication is available
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Apple Sign-In is not available on this device');
  }

  // Generate a secure nonce for the request
  const nonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce
  );

  // Perform Apple authentication
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
    nonce: hashedNonce,
  });

  const { identityToken } = appleCredential;

  if (!identityToken) {
    throw new Error('Failed to get identity token from Apple');
  }

  // Create Firebase credential from Apple token
  const credential = auth.AppleAuthProvider.credential(identityToken, nonce);

  // Sign in to Firebase
  const userCredential = await auth().signInWithCredential(credential);

  // Update display name if provided by Apple (first sign-in only)
  if (appleCredential.fullName?.givenName && !userCredential.user.displayName) {
    const displayName = [
      appleCredential.fullName.givenName,
      appleCredential.fullName.familyName,
    ]
      .filter(Boolean)
      .join(' ');

    if (displayName) {
      await userCredential.user.updateProfile({ displayName });
    }
  }

  return {
    user: userCredential.user,
    isNewUser:
      userCredential.additionalUserInfo?.isNewUser ?? false,
  };
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<{
  user: any;
  isNewUser: boolean;
}> {
  requireAuth();

  if (!GoogleSignin) {
    throw new Error('Google Sign-In is not available');
  }

  // Check for Play Services (Android)
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Get Google credentials
  const signInResult = await GoogleSignin.signIn();

  // Get the ID token
  const idToken = signInResult.data?.idToken;

  if (!idToken) {
    throw new Error('Failed to get ID token from Google');
  }

  // Create Firebase credential from Google token
  const credential = auth.GoogleAuthProvider.credential(idToken);

  // Sign in to Firebase
  const userCredential = await auth().signInWithCredential(credential);

  return {
    user: userCredential.user,
    isNewUser:
      userCredential.additionalUserInfo?.isNewUser ?? false,
  };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  if (!auth) {
    console.log('Firebase not available, nothing to sign out');
    return;
  }

  // Sign out from Google if signed in
  try {
    if (GoogleSignin) {
      const currentUser = GoogleSignin.getCurrentUser();
      if (currentUser) {
        await GoogleSignin.signOut();
      }
    }
  } catch {
    // Ignore Google sign out errors
  }

  // Sign out from Firebase
  await auth().signOut();
}

/**
 * Send email verification to current user
 */
export async function sendEmailVerification(): Promise<void> {
  requireAuth();

  const user = auth().currentUser;
  if (!user) {
    throw new Error('No user is currently signed in');
  }

  if (user.emailVerified) {
    throw new Error('Email is already verified');
  }

  await user.sendEmailVerification();
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  requireAuth();

  const trimmedEmail = email.trim().toLowerCase();

  if (!isValidEmail(trimmedEmail)) {
    throw new Error('Please enter a valid email address');
  }

  await auth().sendPasswordResetEmail(trimmedEmail);
}

/**
 * Reload the current user to get updated email verification status
 */
export async function reloadUser(): Promise<void> {
  if (!auth) return;

  const user = auth().currentUser;
  if (user) {
    await user.reload();
  }
}

/**
 * Subscribe to auth state changes (returns unsubscribe function)
 */
export function onAuthStateChanged(callback: (user: any) => void): () => void {
  if (!auth) {
    // Firebase not available, immediately call with null and return no-op
    callback(null);
    return () => {};
  }
  return auth().onAuthStateChanged(callback);
}

/**
 * Get user-friendly error message from Firebase error code
 */
export function getAuthErrorMessage(error: any): string {
  const errorCode = error?.code;

  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/weak-password': 'Password must be at least 8 characters',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests':
      'Too many failed attempts. Please try again later',
    'auth/network-request-failed':
      'Network error. Please check your connection',
    'auth/user-disabled': 'This account has been disabled',
    'auth/operation-not-allowed': 'This sign-in method is not enabled',
  };

  return errorMessages[errorCode] || error?.message || 'An error occurred';
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
