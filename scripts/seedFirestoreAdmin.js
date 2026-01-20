/**
 * Admin-side Firestore seed script
 * Run: node scripts/seedFirestoreAdmin.js
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize with service account key from Firebase Console
// Download from: https://console.firebase.google.com/u/0/project/prasama-1984c/settings/serviceaccounts/adminsdk
const serviceAccountPath = join(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'prasama-1984c'
});

const db = admin.firestore();

const collections = {
  products: 'p_v9_products',
  transactions: 'p_v9_transactions',
  customers: 'p_v9_customers',
  vendors: 'p_v9_vendors',
  accounts: 'p_v9_accounts',
  categories: 'p_v9_categories',
  daySessions: 'p_v9_daySessions',
  recurringExpenses: 'p_v9_recurringExpenses',
  purchaseOrders: 'p_v9_purchaseOrders',
  profile: 'p_v9_profile'
};

const INITIAL_DATA = {
  [collections.products]: [
    {
      id: 'SKU-001',
      name: 'SAMPLE PRODUCT 1',
      sku: 'SKU-001',
      price: 100,
      cost: 50,
      stock: 50,
      categoryId: 'UNGROUPED'
    }
  ],
  [collections.categories]: [
    {
      id: 'UNGROUPED',
      name: 'UNGROUPED'
    }
  ],
  [collections.customers]: [],
  [collections.vendors]: [],
  [collections.accounts]: [
    {
      id: 'cash',
      name: 'CASH',
      type: 'CASH',
      balance: 0
    }
  ],
  [collections.transactions]: [],
  [collections.daySessions]: [],
  [collections.recurringExpenses]: [],
  [collections.purchaseOrders]: [],
  [collections.profile]: [
    {
      id: 'main',
      name: 'PRASAMA ERP',
      branch: 'Main Terminal',
      isAdmin: true
    }
  ]
};

async function seed() {
  try {
    console.log('Starting Firestore seed with Admin SDK...');

    for (const [collName, docs] of Object.entries(INITIAL_DATA)) {
      if (!Array.isArray(docs) || docs.length === 0) {
        console.log(`⊘ ${collName}: skipped (empty)`);
        continue;
      }

      const batch = db.batch();

      docs.forEach((doc) => {
        const docId = doc.id;
        const ref = db.collection(collName).doc(docId);
        batch.set(ref, { ...doc, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      });

      await batch.commit();
      console.log(`✓ ${collName}: ${docs.length} documents`);
    }

    console.log('Firestore seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
