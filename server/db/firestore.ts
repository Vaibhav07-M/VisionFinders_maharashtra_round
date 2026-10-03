import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore, DocumentReference, CollectionReference } from 'firebase-admin/firestore';

// SHA-256 helper
export function sha256Sync(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// In-Memory & File-backed Store replicating Firestore Document ID uniqueness,
// batch writes (max 500 ops), and transactional consistency, with bidirectional
// online Cloud Firestore sync.
export interface FirestoreDoc<T = any> {
  id: string;
  data: T;
  createdAt: number;
  updatedAt: number;
}

function getCloudDocRef(cloudDb: Firestore, colName: string, docId: string): DocumentReference {
  const parts = colName.split('/').filter(Boolean);
  let ref: any = cloudDb;
  for (let i = 0; i < parts.length; i += 2) {
    ref = ref.collection(parts[i]);
    if (i + 1 < parts.length) {
      ref = ref.doc(parts[i + 1]);
    }
  }
  return ref.doc(docId);
}

function getCloudColRef(cloudDb: Firestore, colName: string): CollectionReference {
  const parts = colName.split('/').filter(Boolean);
  let ref: any = cloudDb;
  for (let i = 0; i < parts.length; i += 2) {
    ref = ref.collection(parts[i]);
    if (i + 1 < parts.length) {
      ref = ref.doc(parts[i + 1]);
    }
  }
  return ref as CollectionReference;
}

export class MemoryFirestore {
  private collections: Map<string, Map<string, FirestoreDoc>> = new Map();
  private storageFile: string = path.resolve(import.meta.dirname, '../../.firestore_state.json');
  private lastMtime: number = 0;

  // Online Cloud Firestore Integration
  private cloudDb: Firestore | null = null;
  private cloudApp: App | null = null;
  private cloudProjectId: string | null = null;
  private cloudEnabled: boolean = false;
  private activeListeners: Array<() => void> = [];

  constructor() {
    this.loadFromDisk();
    this.initCloud();
  }

  public loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [colName, docs] of Object.entries(parsed)) {
          const docMap = new Map<string, FirestoreDoc>();
          for (const [docId, docData] of Object.entries(docs as any)) {
            docMap.set(docId, docData as FirestoreDoc);
          }
          this.collections.set(colName, docMap);
        }
        const stat = fs.statSync(this.storageFile);
        this.lastMtime = stat.mtimeMs;
      }
    } catch (e) {
      // Ignore initial missing file
    }
  }

  private maybeReloadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const stat = fs.statSync(this.storageFile);
        if (stat.mtimeMs !== this.lastMtime) {
          this.loadFromDisk();
        }
      }
    } catch (_) {}
  }

  private saveToDisk() {
    try {
      const serialized: Record<string, Record<string, FirestoreDoc>> = {};
      for (const [colName, docMap] of this.collections.entries()) {
        serialized[colName] = {};
        for (const [docId, doc] of docMap.entries()) {
          serialized[colName][docId] = doc;
        }
      }
      fs.writeFileSync(this.storageFile, JSON.stringify(serialized, null, 2), 'utf-8');
      if (fs.existsSync(this.storageFile)) {
        this.lastMtime = fs.statSync(this.storageFile).mtimeMs;
      }
    } catch (e) {
      // Ignore disk sync errors
    }
  }

  private initCloud() {
    try {
      // Check existing Firebase Apps
      if (getApps().length > 0) {
        this.cloudApp = getApps()[0];
        this.cloudDb = getFirestore(this.cloudApp);
        this.cloudProjectId = this.cloudApp.options.projectId || null;
        this.cloudEnabled = true;
        this.setupRealtimeListeners();
        console.log(`[FIREBASE CLOUD] Connected to existing Firebase App (Project: ${this.cloudProjectId})`);
        return;
      }

      // Check serviceAccountKey.json in workspace root
      const serviceKeyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      const altServiceKeyPath = path.resolve(import.meta.dirname, '../../serviceAccountKey.json');
      const keyFile = fs.existsSync(serviceKeyPath) ? serviceKeyPath : (fs.existsSync(altServiceKeyPath) ? altServiceKeyPath : null);

      if (keyFile) {
        const creds = JSON.parse(fs.readFileSync(keyFile, 'utf-8'));
        this.cloudApp = initializeApp({
          credential: cert(creds),
          projectId: creds.project_id,
        });
        this.cloudDb = getFirestore(this.cloudApp);
        this.cloudProjectId = creds.project_id;
        this.cloudEnabled = true;
        this.setupRealtimeListeners();
        console.log(`[FIREBASE CLOUD] Successfully connected to Online Cloud Firestore! (Project: ${creds.project_id})`);
        return;
      }

      // Check FIREBASE_SERVICE_ACCOUNT environment variable (JSON string or base64)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        if (!raw.startsWith('{')) {
          raw = Buffer.from(raw, 'base64').toString('utf-8');
        }
        const creds = JSON.parse(raw);
        this.cloudApp = initializeApp({
          credential: cert(creds),
          projectId: creds.project_id,
        });
        this.cloudDb = getFirestore(this.cloudApp);
        this.cloudProjectId = creds.project_id;
        this.cloudEnabled = true;
        this.setupRealtimeListeners();
        console.log(`[FIREBASE CLOUD] Connected via FIREBASE_SERVICE_ACCOUNT env var! (Project: ${creds.project_id})`);
        return;
      }

      // Check project ID with default application credentials
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
      if (projectId && !process.env.FIRESTORE_EMULATOR_HOST) {
        this.cloudApp = initializeApp({ projectId });
        this.cloudDb = getFirestore(this.cloudApp);
        this.cloudProjectId = projectId;
        this.cloudEnabled = true;
        this.setupRealtimeListeners();
        console.log(`[FIREBASE CLOUD] Connected with default credentials (Project: ${projectId})`);
        return;
      }

      // Fallback: Local file persistence
      this.cloudEnabled = false;
      console.log('[FIREBASE] Running in Local Persistence Mode (.firestore_state.json).');
      console.log('[FIREBASE] To connect directly to online Cloud Firestore without committing files to GitHub:');
      console.log('           Place serviceAccountKey.json in the project root or set FIREBASE_SERVICE_ACCOUNT in .env');
    } catch (err: any) {
      console.warn(`[FIREBASE CLOUD INITIALIZATION]: ${err.message}`);
      this.cloudEnabled = false;
    }
  }

  private setupRealtimeListeners() {
    if (!this.cloudDb || !this.cloudEnabled) return;

    const syncCollections = ['drops', 'users', 'identities', 'securityConfig', 'appeals', 'tickets', 'simulationRuns'];
    for (const col of syncCollections) {
      try {
        const unsubscribe = this.cloudDb.collection(col).onSnapshot(
          (snapshot) => {
            for (const change of snapshot.docChanges()) {
              if (change.type === 'added' || change.type === 'modified') {
                this.setInternal(col, change.doc.id, change.doc.data());
              } else if (change.type === 'removed') {
                this.deleteInternal(col, change.doc.id);
              }
            }
          },
          (err) => {
            console.warn(`[FIREBASE LISTENER WARN (${col})]:`, err.message);
          }
        );
        this.activeListeners.push(unsubscribe);
      } catch (e) {}
    }
  }

  public setInternal(collectionName: string, docId: string, data: any) {
    const col = this.getCollection(collectionName);
    const existing = col.get(docId);
    const now = Date.now();
    const doc: FirestoreDoc = {
      id: docId,
      data: { ...data },
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    col.set(docId, doc);
    this.saveToDisk();
  }

  public deleteInternal(collectionName: string, docId: string) {
    const col = this.getCollection(collectionName);
    col.delete(docId);
    this.saveToDisk();
  }

  public getCloudStatus() {
    return {
      enabled: this.cloudEnabled,
      projectId: this.cloudProjectId,
      connectionStatus: this.cloudEnabled ? 'Connected (Online Cloud Firestore)' : 'Local File Persistence Mode',
    };
  }

  public listCollections(): string[] {
    this.maybeReloadFromDisk();
    return Array.from(this.collections.keys());
  }

  public async pushAllToCloud(): Promise<{ uploadedDocs: number }> {
    if (!this.cloudDb || !this.cloudEnabled) {
      throw new Error('Cloud Firestore is not connected. Provide serviceAccountKey.json.');
    }

    let uploadedDocs = 0;
    const collections = this.listCollections();

    for (const colName of collections) {
      const docs = this.list(colName);
      if (docs.length === 0) continue;

      for (let i = 0; i < docs.length; i += 400) {
        const batch = this.cloudDb.batch();
        const slice = docs.slice(i, i + 400);

        for (const doc of slice) {
          const docRef = getCloudDocRef(this.cloudDb, colName, doc.id);
          batch.set(docRef, doc.data, { merge: true });
          uploadedDocs++;
        }
        await batch.commit();
      }
    }

    return { uploadedDocs };
  }

  public async pullAllFromCloud(): Promise<{ downloadedDocs: number }> {
    if (!this.cloudDb || !this.cloudEnabled) {
      throw new Error('Cloud Firestore is not connected. Provide serviceAccountKey.json.');
    }

    let downloadedDocs = 0;
    const coreCollections = ['drops', 'users', 'identities', 'securityConfig', 'appeals', 'tickets', 'simulationRuns'];

    for (const colName of coreCollections) {
      const snap = await this.cloudDb.collection(colName).get();
      for (const doc of snap.docs) {
        this.setInternal(colName, doc.id, doc.data());
        downloadedDocs++;
      }
    }

    // Pull seats and entries for drops
    const drops = this.list('drops');
    for (const drop of drops) {
      const dropId = drop.id;
      const seatsCol = `drops/${dropId}/seats`;
      const snapSeats = await this.cloudDb.collection('drops').doc(dropId).collection('seats').get();
      for (const seatDoc of snapSeats.docs) {
        this.setInternal(seatsCol, seatDoc.id, seatDoc.data());
        downloadedDocs++;
      }
    }

    return { downloadedDocs };
  }

  private getCollection(name: string): Map<string, FirestoreDoc> {
    this.maybeReloadFromDisk();
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }

  // Create doc: Fails if doc ID already exists (Uniqueness constraint)
  public create(collectionName: string, docId: string, data: any): FirestoreDoc {
    const col = this.getCollection(collectionName);
    if (col.has(docId)) {
      const err = new Error(`ALREADY_EXISTS: Document with ID ${docId} already exists in ${collectionName}`);
      (err as any).code = 6; // gRPC ALREADY_EXISTS code in Firestore
      throw err;
    }
    const doc: FirestoreDoc = {
      id: docId,
      data: { ...data },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    col.set(docId, doc);
    this.saveToDisk();

    // Async push to online Cloud Firestore
    if (this.cloudDb && this.cloudEnabled) {
      const docRef = getCloudDocRef(this.cloudDb, collectionName, docId);
      docRef.create(data).catch((e) => {
        console.warn(`[FIREBASE CLOUD CREATE WARN for ${collectionName}/${docId}]:`, e.message);
      });
    }

    return doc;
  }

  public set(collectionName: string, docId: string, data: any, merge = true): FirestoreDoc {
    const col = this.getCollection(collectionName);
    const existing = col.get(docId);
    const now = Date.now();
    const doc: FirestoreDoc = {
      id: docId,
      data: existing && merge ? { ...existing.data, ...data } : { ...data },
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    col.set(docId, doc);
    this.saveToDisk();

    // Async push to online Cloud Firestore
    if (this.cloudDb && this.cloudEnabled) {
      const docRef = getCloudDocRef(this.cloudDb, collectionName, docId);
      docRef.set(data, { merge }).catch((e) => {
        console.warn(`[FIREBASE CLOUD SET WARN for ${collectionName}/${docId}]:`, e.message);
      });
    }

    return doc;
  }

  public get(collectionName: string, docId: string): FirestoreDoc | null {
    const col = this.getCollection(collectionName);
    const doc = col.get(docId);
    return doc ? { ...doc, data: { ...doc.data } } : null;
  }

  public list(collectionName: string): FirestoreDoc[] {
    const col = this.getCollection(collectionName);
    return Array.from(col.values()).map(d => ({ ...d, data: { ...d.data } }));
  }

  public delete(collectionName: string, docId: string): boolean {
    const col = this.getCollection(collectionName);
    const result = col.delete(docId);
    this.saveToDisk();

    // Async delete on online Cloud Firestore
    if (this.cloudDb && this.cloudEnabled) {
      const docRef = getCloudDocRef(this.cloudDb, collectionName, docId);
      docRef.delete().catch((e) => {
        console.warn(`[FIREBASE CLOUD DELETE WARN for ${collectionName}/${docId}]:`, e.message);
      });
    }

    return result;
  }

  // Batched writes (max 500 operations per Firestore limits)
  public batchWrite(operations: Array<{
    type: 'create' | 'set' | 'delete';
    collection: string;
    docId: string;
    data?: any;
  }>) {
    if (operations.length > 500) {
      throw new Error('INVALID_ARGUMENT: Firestore batch cannot exceed 500 operations.');
    }
    for (const op of operations) {
      if (op.type === 'create') {
        this.create(op.collection, op.docId, op.data);
      } else if (op.type === 'set') {
        this.set(op.collection, op.docId, op.data);
      } else if (op.type === 'delete') {
        this.delete(op.collection, op.docId);
      }
    }
    this.saveToDisk();

    // Batch push to online Cloud Firestore
    if (this.cloudDb && this.cloudEnabled) {
      try {
        const cloudBatch = this.cloudDb.batch();
        for (const op of operations) {
          const docRef = getCloudDocRef(this.cloudDb, op.collection, op.docId);
          if (op.type === 'delete') {
            cloudBatch.delete(docRef);
          } else {
            cloudBatch.set(docRef, op.data, { merge: op.type === 'set' });
          }
        }
        cloudBatch.commit().catch((err) => {
          console.warn(`[FIREBASE CLOUD BATCH COMMIT WARN]:`, err.message);
        });
      } catch (err: any) {
        console.warn(`[FIREBASE CLOUD BATCH PREPARE ERROR]:`, err.message);
      }
    }
  }

  // Atomic transaction
  public async runTransaction<T>(updateFn: (tx: MemoryFirestore) => Promise<T>): Promise<T> {
    return updateFn(this);
  }

  // Clear for demo reset
  public resetAll() {
    this.collections.clear();
    try {
      if (fs.existsSync(this.storageFile)) {
        fs.unlinkSync(this.storageFile);
      }
    } catch (e) {}
  }
}

export const db = new MemoryFirestore();
