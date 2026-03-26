import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isSubscribed: boolean;
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateRole: (role: UserRole) => Promise<void>;
  activateSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        const isAdminEmail = user.email?.toLowerCase() === 'naren.papanaboina@gmail.com';
        const targetRole = isAdminEmail ? 'admin' : 'customer';

        if (docSnap.exists()) {
          let currentProfile = docSnap.data() as UserProfile;
          let needsUpdate = false;

          // Upgrade to admin if email matches but role is not admin
          if (isAdminEmail && currentProfile.role !== 'admin') {
            currentProfile.role = 'admin';
            needsUpdate = true;
          }

          // Auto-subscribe if not subscribed
          if (!currentProfile.subscriptionEndsAt) {
            const endsAt = new Date();
            endsAt.setDate(endsAt.getDate() + 100);
            currentProfile.subscriptionEndsAt = endsAt.toISOString();
            needsUpdate = true;
          }

          if (needsUpdate) {
            await setDoc(docRef, currentProfile, { merge: true });
          }
          setProfile(currentProfile);
        } else {
          // New user
          const endsAt = new Date();
          endsAt.setDate(endsAt.getDate() + 100);

          const newProfile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || 'Anonymous',
            email: user.email || '',
            photoURL: user.photoURL || '',
            role: targetRole, // Assign admin if email matches
            createdAt: new Date().toISOString(),
            subscriptionEndsAt: endsAt.toISOString(),
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    if (isLoggingIn) return false;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User intentionally closed the popup or clicked multiple times, not an actual error
        return false;
      }
      console.error('Login error:', error);
      toast.error(`Failed to login: ${error.message || 'Please try again.'}`);
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateRole = async (role: UserRole) => {
    if (user && profile) {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { ...profile, role }, { merge: true });
      setProfile({ ...profile, role });
    }
  };

  const isSubscribed = React.useMemo(() => {
    if (profile?.role === 'admin' || user?.email?.toLowerCase() === 'naren.papanaboina@gmail.com') return true;
    if (!profile?.subscriptionEndsAt) return false;
    return new Date(profile.subscriptionEndsAt) > new Date();
  }, [profile?.subscriptionEndsAt, profile?.role, user?.email]);

  const activateSubscription = async () => {
    if (user && profile) {
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 100); // 100 days free
      const subscriptionEndsAt = endsAt.toISOString();
      
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { subscriptionEndsAt }, { merge: true });
      setProfile({ ...profile, subscriptionEndsAt });
      toast.success('100 Days Free Subscription Activated!');
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isSubscribed, login, logout, updateRole, activateSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
