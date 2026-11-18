import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  User,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { PrivateUserInfo, UserProfile } from '../types';
import { OperationType, auth, db, handleFirestoreError, testFirestoreConnection } from '../services/firebase';
import {
  createOrUpdateUserProfile,
  deleteAccountData,
  savePrivateUserInfo,
} from '../services/firestoreService';
import {
  getLocalCurrentUid,
  localChangePassword,
  localDeleteAccount,
  localEnterDemo,
  localLogin,
  localLogout,
  localResetPassword,
  localSignup,
  localSubscribePrivateInfo,
  localSubscribeUserProfile,
} from '../services/localWorkspace';
import { ensureSamplePartnersSeeded } from '../services/seedData';

interface AuthContextValue {
  firebaseUser: User | null;
  currentUid: string | null;
  isAuthenticated: boolean;
  isCloudSynced: boolean;
  userProfile: UserProfile | null;
  privateInfo: PrivateUserInfo | null;
  authReady: boolean;
  profileLoading: boolean;
  signupWithEmail: (fullName: string, email: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  enterDemoMode: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (currentPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [localUid, setLocalUid] = useState<string | null>(() => getLocalCurrentUid());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<PrivateUserInfo | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  const currentUid = firebaseUser?.uid || localUid;
  const isAuthenticated = Boolean(currentUid);
  const isCloudSynced = Boolean(firebaseUser);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let unsubPrivate: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);

      if (unsubProfile) unsubProfile();
      if (unsubPrivate) unsubPrivate();

      if (user) {
        setProfileLoading(true);
        ensureSamplePartnersSeeded();

        const profilePath = `users/${user.uid}`;
        unsubProfile = onSnapshot(
          doc(db, 'users', user.uid),
          async (snap) => {
            if (snap.exists()) {
              setUserProfile({ ...(snap.data() as UserProfile), uid: snap.id });
              setProfileLoading(false);
            } else {
              await createOrUpdateUserProfile(
                user.uid,
                {
                  fullName: user.displayName || user.email?.split('@')[0] || 'Student',
                  avatarUrl: user.photoURL || '',
                  onboardingCompleted: false,
                },
                true
              );
              await savePrivateUserInfo(user.uid, user.email || '');
            }
          },
          (err) => {
            setProfileLoading(false);
            handleFirestoreError(err, OperationType.GET, profilePath);
          }
        );

        const privatePath = `users/${user.uid}/private/info`;
        unsubPrivate = onSnapshot(
          doc(db, 'users', user.uid, 'private', 'info'),
          (snap) => {
            if (snap.exists()) {
              setPrivateInfo(snap.data() as PrivateUserInfo);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, privatePath)
        );
      } else {
        // Check local session
        const activeLocal = getLocalCurrentUid();
        setLocalUid(activeLocal);
        if (!activeLocal) {
          setUserProfile(null);
          setPrivateInfo(null);
          setProfileLoading(false);
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubPrivate) unsubPrivate();
    };
  }, []);

  // Subscribe to local user profile when active in local/demo mode
  useEffect(() => {
    if (firebaseUser || !localUid) return;
    setProfileLoading(true);
    const unsubProfile = localSubscribeUserProfile(localUid, (p) => {
      setUserProfile(p);
      setProfileLoading(false);
    });
    const unsubPrivate = localSubscribePrivateInfo(localUid, setPrivateInfo);
    return () => {
      unsubProfile();
      unsubPrivate();
    };
  }, [firebaseUser, localUid]);

  // Mark online presence cleanly while signed in
  useEffect(() => {
    if (!currentUid || !userProfile) return;
    createOrUpdateUserProfile(currentUid, { isOnline: true }).catch(() => {});

    const handleBeforeUnload = () => {
      createOrUpdateUserProfile(currentUid, { isOnline: false }).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUid, Boolean(userProfile)]);

  const signupWithEmail = async (fullName: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: fullName.trim() });
      await createOrUpdateUserProfile(
        cred.user.uid,
        {
          fullName: fullName.trim(),
          avatarUrl: '',
          onboardingCompleted: false,
        },
        true
      );
      await savePrivateUserInfo(cred.user.uid, email.trim());
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        const uid = localSignup(fullName, email, password);
        setLocalUid(uid);
        return;
      }
      throw err;
    }
  };

  const loginWithEmail = async (email: string, password: string, rememberMe: boolean) => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        const uid = localLogin(email, password);
        setLocalUid(uid);
        return;
      }
      throw err;
    }
  };

  const enterDemoMode = async () => {
    if (auth.currentUser) {
      await signOut(auth);
    }
    const uid = localEnterDemo();
    setLocalUid(uid);
  };

  const sendResetEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/operation-not-allowed') {
        const found = localResetPassword(email);
        if (!found) {
          throw new Error('No local account found for that email. Use Instant Demo Login or Sign Up.');
        }
        return;
      }
      throw err;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (auth.currentUser && auth.currentUser.email) {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      return;
    }
    if (localUid) {
      localChangePassword(localUid, currentPassword, newPassword);
      return;
    }
    throw new Error('No password-authenticated user found.');
  };

  const deleteAccount = async (currentPassword?: string) => {
    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      if (currentPassword && auth.currentUser.email) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      await deleteAccountData(uid);
      await deleteUser(auth.currentUser);
      return;
    }
    if (localUid) {
      localDeleteAccount(localUid);
      setLocalUid(null);
    }
  };

  const logout = async () => {
    if (firebaseUser) {
      await createOrUpdateUserProfile(firebaseUser.uid, { isOnline: false }).catch(() => {});
      await signOut(auth);
    }
    if (localUid) {
      localLogout();
      setLocalUid(null);
    }
    setUserProfile(null);
    setPrivateInfo(null);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentUid,
        isAuthenticated,
        isCloudSynced,
        userProfile,
        privateInfo,
        authReady,
        profileLoading,
        signupWithEmail,
        loginWithEmail,
        enterDemoMode,
        sendResetEmail,
        changePassword,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
