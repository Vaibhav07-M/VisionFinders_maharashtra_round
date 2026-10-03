import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function fixAllEventTimes() {
  const creds = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf-8'));
  const app = initializeApp({ credential: cert(creds), projectId: creds.project_id });
  const db = getFirestore(app);

  const now = Date.now();
  console.log('[RESET] Setting all event times to active future windows...');

  // 1. Jack White Vault Drop (Featured Main Drop)
  const jackWhiteRef = db.collection('drops').doc('drop-jack-white-vault');
  const jackWhiteDoc = await jackWhiteRef.get();
  if (jackWhiteDoc.exists) {
    await jackWhiteRef.update({
      status: 'open',
      windowStart: new Date(now - 1000 * 60 * 10).toISOString(),          // opened 10 mins ago
      windowEnd: new Date(now + 1000 * 60 * 120).toISOString(),          // closes in 2 hours
      drawTime: new Date(now + 1000 * 60 * 125).toISOString(),           // draw in 2h 5m
      revealedSeed: null,
    });
    console.log('[SUCCESS] Updated drop-jack-white-vault: Status = "open", Window closes in 2 hours');
  }

  // 2. Daft Punk (Scheduled Drop)
  const daftPunkRef = db.collection('drops').doc('drop-daft-punk-unreleased');
  const daftPunkDoc = await daftPunkRef.get();
  if (daftPunkDoc.exists) {
    await daftPunkRef.update({
      status: 'scheduled',
      windowStart: new Date(now + 1000 * 60 * 240).toISOString(),        // opens in 4 hours
      windowEnd: new Date(now + 1000 * 60 * 360).toISOString(),          // closes in 6 hours
      drawTime: new Date(now + 1000 * 60 * 370).toISOString(),           // draw in 6h 10m
    });
    console.log('[SUCCESS] Updated drop-daft-punk-unreleased: Status = "scheduled", Opens in 4 hours');
  }

  // 3. FCFS Baseline Control
  const fcfsRef = db.collection('drops').doc('drop-fcfs-baseline-control');
  const fcfsDoc = await fcfsRef.get();
  if (fcfsDoc.exists) {
    await fcfsRef.update({
      status: 'open',
      windowStart: new Date(now - 1000 * 60 * 15).toISOString(),         // opened 15 mins ago
      windowEnd: new Date(now + 1000 * 60 * 180).toISOString(),          // closes in 3 hours
      drawTime: new Date(now + 1000 * 60 * 185).toISOString(),
    });
    console.log('[SUCCESS] Updated drop-fcfs-baseline-control: Status = "open", Window closes in 3 hours');
  }

  // 4. Update all other custom drops created by user
  const allDrops = await db.collection('drops').get();
  for (const doc of allDrops.docs) {
    if (!['drop-jack-white-vault', 'drop-daft-punk-unreleased', 'drop-fcfs-baseline-control'].includes(doc.id)) {
      await doc.ref.update({
        status: 'open',
        windowStart: new Date(now - 1000 * 60 * 5).toISOString(),
        windowEnd: new Date(now + 1000 * 60 * 120).toISOString(),
        drawTime: new Date(now + 1000 * 60 * 125).toISOString(),
      });
      console.log(`[SUCCESS] Updated custom drop [${doc.id}]: "${doc.data().name}": Active for next 2 hours`);
    }
  }

  console.log('\n[COMPLETE] All drops in Google Cloud Firestore have active future countdown times!');
  process.exit(0);
}

fixAllEventTimes().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
