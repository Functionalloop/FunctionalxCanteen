import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, googleProvider, db } from './firebase';

// ─── Types ───────────────────────────────────────────────────
export type UserRole = 'student' | 'vendor';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  loginWithGoogle: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Helper for DB timeouts
const withTimeout = <T,>(promise: Promise<T>, ms = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Firebase DB timeout - check rules and connection')), ms)
    )
  ]);
};

// ─── Role helpers using Firebase RTDB ────────────────────────
async function saveUserProfile(uid: string, role: UserRole, name: string | null, email: string | null) {
  await withTimeout(set(ref(db, `users/${uid}`), {
    role,
    displayName: name || '',
    email: email || '',
    updatedAt: new Date().toISOString(),
  }));
}

async function fetchUserRole(uid: string): Promise<UserRole | null> {
  try {
    const snap = await withTimeout(get(ref(db, `users/${uid}/role`)));
    return snap.exists() ? (snap.val() as UserRole) : null;
  } catch (err) {
    console.error('Error fetching role:', err);
    return null;
  }
}

// ─── Context ─────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const role = await fetchUserRole(firebaseUser.uid);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: role || 'student', // default to student if not yet written
          });
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Email/Password Login ───────────────────────────────────
  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const role = await fetchUserRole(result.user.uid);
      if (!role) {
        // Existing Firebase user but no DB role — default to student
        await saveUserProfile(result.user.uid, 'student', result.user.displayName, result.user.email);
      }
      
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        role: role || 'student',
      });
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential' ? 'Invalid email or password'
        : err.code === 'auth/user-not-found' ? 'No account found with this email'
        : err.code === 'auth/wrong-password' ? 'Incorrect password'
        : err.code === 'auth/too-many-requests' ? 'Too many attempts. Try again later.'
        : err.message || 'Login failed';
      setError(msg);
      throw err;
    }
  };

  // ── Email/Password Signup ──────────────────────────────────
  const signup = async (email: string, password: string, name: string, role: UserRole) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await saveUserProfile(result.user.uid, role, name, result.user.email);

      // Give new students a starter wallet balance of ₹500
      if (role === 'student') {
        await withTimeout(Promise.all([
          set(ref(db, `users/${result.user.uid}/wallet`), 500),
          set(ref(db, `users/${result.user.uid}/gpa`), 0),
          set(ref(db, `users/${result.user.uid}/streak`), 0)
        ]));
      }

      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: name,
        photoURL: null,
        role,
      });
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'An account with this email already exists'
        : err.code === 'auth/weak-password' ? 'Password must be at least 6 characters'
        : err.code === 'auth/invalid-email' ? 'Invalid email address'
        : err.message || 'Signup failed';
      setError(msg);
      throw err;
    }
  };

  // ── Google Sign-In ─────────────────────────────────────────
  const loginWithGoogle = async (role: UserRole) => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const existingRole = await fetchUserRole(result.user.uid);
      const finalRole = existingRole || role;
      // Always upsert the profile (keeps email/displayName fresh)
      await saveUserProfile(result.user.uid, finalRole, result.user.displayName, result.user.email);
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        role: finalRole,
      });
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return;
      const msg =
        err.code === 'auth/popup-blocked' ? 'Popup was blocked. Allow popups and try again.'
        : err.message || 'Google sign-in failed';
      setError(msg);
      throw err;
    }
  };

  // ── Logout ─────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, loginWithGoogle, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}
