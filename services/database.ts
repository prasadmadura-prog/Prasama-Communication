import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Firestore } from "firebase/firestore";

/**
 * FIREBASE SETUP:
 * Configured with user-provided credentials for 'prasamapos' project.
 */

const firebaseConfig = {
  apiKey: "AIzaSyCx8V3BFStTHfPNJm4Vw_U5KATEojCiufg",
  authDomain: "prasamapos.firebaseapp.com",
  projectId: "prasamapos",
  storageBucket: "prasamapos.firebasestorage.app",
  messagingSenderId: "673674172591",
  appId: "1:673674172591:web:c97132b1219a4784981c5a"
};

let db: Firestore | null = null;

// Verify configuration is present
const isConfigured = firebaseConfig.projectId && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_ACTUAL_API_KEY";

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization failed. Operating in Local Mode.", error);
  }
}

const DOC_PATH = "prasama_erp/production_v1";

export async function loadCloudData() {
  if (!db) return null;
  try {
    const docRef = doc(db, DOC_PATH);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.warn("Cloud Load Error (Check if Firestore API is enabled in Cloud Console):", error);
    return null;
  }
}

export async function saveCloudData(data: any) {
  if (!db) return false;
  try {
    const docRef = doc(db, DOC_PATH);
    // Overwrite the single state document with the latest client state
    await setDoc(docRef, data, { merge: false });
    return true;
  } catch (error) {
    console.warn("Cloud Sync Error (Check Firestore permissions/API status):", error);
    return false;
  }
}

export function subscribeToChanges(callback: (data: any) => void) {
  if (!db) return () => {};
  return onSnapshot(doc(db, DOC_PATH), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
}