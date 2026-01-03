import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "firebase/firestore";
import { WatchlistItem, Notification } from '../types';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(app);
const firestore = getFirestore(app);

export const auth = {
  onAuthStateChanged: (callback: (user: any) => void) => {
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
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(firebaseAuth, provider);
    return result.user;
  },

  logout: () => signOut(firebaseAuth)
};

export const db = {
  saveUserData: async (uid: string, watchlist: WatchlistItem[], notifications: Notification[]) => {
    if (!uid) return;
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
    if (!uid) return { watchlist: [], notifications: [] };
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
