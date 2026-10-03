import { db } from './firestore';
import fs from 'fs';
import path from 'path';

async function runCli() {
  const command = process.argv[2] || 'status';
  console.log('\n========================================================================');
  console.log(`[FIREBASE CLOUD SYNC TOOL] Executing command: "${command.toUpperCase()}"`);
  console.log('========================================================================\n');

  const status = db.getCloudStatus();
  console.log(`Connection Status: ${status.connectionStatus}`);
  console.log(`Project ID:        ${status.projectId || 'None (Running in local persistence mode)'}`);
  console.log(`Cloud Active:      ${status.enabled ? 'YES (Live Online Sync)' : 'NO (Local Only)'}\n`);

  if (!status.enabled) {
    console.log('------------------------------------------------------------------------');
    console.log('HOW TO CONNECT YOUR ONLINE CLOUD FIRESTORE IN 3 STEPS:');
    console.log('1. Go to Firebase Console (https://console.firebase.google.com)');
    console.log('   Create or select your project, then open Project Settings -> Service accounts.');
    console.log('2. Click "Generate new private key" to download your service account JSON file.');
    console.log('3. Save that file as "serviceAccountKey.json" in this project\'s root folder:');
    console.log(`   ${path.resolve(process.cwd(), 'serviceAccountKey.json')}`);
    console.log('   (Note: serviceAccountKey.json is already in .gitignore, so it will NEVER be committed).');
    console.log('\n   Alternatively, paste the JSON content into .env:');
    console.log('   FIREBASE_SERVICE_ACCOUNT=\'{"type":"service_account",...}\'');
    console.log('------------------------------------------------------------------------\n');
  }

  if (command === 'push') {
    if (!status.enabled) {
      console.error('[ERROR] Cannot push to Cloud Firestore without credentials. Please provide serviceAccountKey.json.');
      process.exit(1);
    }
    console.log('[PUSH] Uploading all local collections to online Cloud Firestore...');
    const result = await db.pushAllToCloud();
    console.log(`[PUSH SUCCESS] Uploaded ${result.uploadedDocs} documents across all collections to Cloud Firestore!`);
  } else if (command === 'pull') {
    if (!status.enabled) {
      console.error('[ERROR] Cannot pull from Cloud Firestore without credentials. Please provide serviceAccountKey.json.');
      process.exit(1);
    }
    console.log('[PULL] Downloading all collections from online Cloud Firestore...');
    const result = await db.pullAllFromCloud();
    console.log(`[PULL SUCCESS] Downloaded ${result.downloadedDocs} documents from Cloud Firestore!`);
  } else if (command === 'status') {
    const collections = db.listCollections();
    console.log('Local Collections Overview:');
    let totalDocs = 0;
    for (const col of collections) {
      const count = db.list(col).length;
      totalDocs += count;
      console.log(`  - ${col.padEnd(40)} ${count} docs`);
    }
    console.log(`\nTotal Local Documents: ${totalDocs}`);
  }
}

runCli().catch((err) => {
  console.error('[CLI ERROR]', err);
  process.exit(1);
});
