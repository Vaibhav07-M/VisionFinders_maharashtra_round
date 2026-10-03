import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function listOnlineCollections() {
  const creds = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf-8'));
  const app = initializeApp({ credential: cert(creds), projectId: creds.project_id });
  const cloudDb = getFirestore(app);

  console.log('[FIREBASE] Querying root collections in fair-drop-15058...');
  const collections = await cloudDb.listCollections();
  for (const col of collections) {
    const snap = await col.limit(10).get();
    console.log(`  - Collection: ${col.id} (Sample count: ${snap.size})`);
    if (col.id === 'drops') {
      for (const dropDoc of snap.docs) {
        const subCols = await dropDoc.ref.listCollections();
        for (const sub of subCols) {
          const subSnap = await sub.limit(10).get();
          console.log(`      └─ Subcollection: drops/${dropDoc.id}/${sub.id} (Sample count: ${subSnap.size})`);
        }
      }
    }
  }
}

listOnlineCollections().catch(console.error);
