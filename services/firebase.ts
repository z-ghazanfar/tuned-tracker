
import { initializeApp, getApps, getApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  Auth
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  Firestore
} from "firebase/firestore";
import { WatchlistItem, Notification } from '../types';


const getEnvVar = (key: string): string => {
  return (import.meta as any).env?.[`VITE_${key}`] || (window as any).process?.env?.[key] || "";
};

const firebaseConfig = {
  apiKey: getEnvVar("FIREBASE_API_KEY"),
  authDomain: getEnvVar("FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("FIREBASE_APP_ID"),
  measurementId: getEnvVar("FIREBASE_MEASUREMENT_ID")
};

let app: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestore: Firestore | null = null;

try {
  if (firebaseConfig.apiKey) {
    const existingApps = getApps();
    app = existingApps.length === 0 ? initializeApp(firebaseConfig) : getApp();
    firebaseAuth = getAuth(app);
    firestore = getFirestore(app);
  } else {
    console.warn("Firebase Configuration missing. Features like Auth and Sync will be disabled.");
  }
} catch (error) {
  console.error("Firebase failed to initialize:", error);
}

export const auth = {
  onAuthStateChanged: (callback: (user: any) => void) => {
    if (!firebaseAuth) return () => {};
    return onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        callback({
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0],
          email: user.email,
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
        });
      } else {
        callback(null);
      }
    });
  },

  loginWithGoogle: async () => {
    if (!firebaseAuth) throw new Error("Authentication is not configured.");
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(firebaseAuth, provider);
    return result.user;
  },

  logout: () => firebaseAuth ? signOut(firebaseAuth) : Promise.resolve()
};

export const db = {
  saveUserData: async (uid: string, watchlist: WatchlistItem[], notifications: Notification[]) => {
    if (!uid || !firestore) return;
    try {
      const docRef = doc(firestore, "users", uid);
      await setDoc(docRef, { 
        watchlist,
        notifications,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Firestore Save Error:", error);
    }
  },

  getUserData: async (uid: string): Promise<{ watchlist: WatchlistItem[], notifications: Notification[] }> => {
    if (!uid || !firestore) return { watchlist: [], notifications: [] };
    try {
      const docRef = doc(firestore, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          watchlist: data.watchlist || [],
          notifications: data.notifications || []
        };
      }
      return { watchlist: [], notifications: [] };
    } catch (error) {
      console.error("Firestore Sync Error:", error);
      return { watchlist: [], notifications: [] };
    }
  }
};
