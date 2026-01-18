import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * FIREBASE INITIALIZATION
 * Project: prasama-1984c
 * Requirements: Authentication only.
 */

const firebaseConfig = {
  apiKey: "AIzaSyBaqtDnkyQVqOItmUTDOBvhOVtBDYRsOyQ",
  authDomain: "prasama-1984c.firebaseapp.com",
  projectId: "prasama-1984c",
  storageBucket: "prasama-1984c.firebasestorage.app",
  messagingSenderId: "703953550630",
  appId: "1:703953550630:web:ad3fc37647050a488515e7"
};

// Initialize Firebase once as a singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get the Auth service instance exactly as requested
export const auth = getAuth(app);

/**
 * Persistence Stubs
 * Data is managed locally via App.tsx to ensure offline reliability.
 */
export async function loadCloudData() {
  return null;
}

export async function saveCloudData(data: any) {
  return false;
}

export function isCloudEnabled() {
  return false;
}