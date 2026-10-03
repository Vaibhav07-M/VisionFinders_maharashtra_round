import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function checkAndUpdateDrops() {
  const creds = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf-8'));
  const app = initializeApp({ credential: cert(creds), projectId: creds.project_id });
  const db = getFirestore(app);

  const snap = await db.collection('drops').get();
  console.log(`Found ${snap.size} drops in Cloud Firestore:`);

  const now = Date.now();

  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`\nDrop [${doc.id}]: "${d.name}"`);
    console.log(`  Current Status:      ${d.status}`);
    console.log(`  Current windowStart: ${d.windowStart}`);
    console.log(`  Current windowEnd:   ${d.windowEnd}`);
    console.log(`  Current drawTime:    ${d.drawTime}`);
    console.log(`  Has expired?         ${new Date(d.windowEnd).getTime() < now}`);
  }
}

checkAndUpdateDrops().catch(console.error);
