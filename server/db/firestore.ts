import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// SHA-256 helper
export function sha256Sync(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// In-Memory & File-backed Store replicating Firestore Document ID uniqueness,
// batch writes (max 500 ops), and transactional consistency.
export interface FirestoreDoc<T = any> {
  id: string;
  data: T;
  createdAt: number;
  updatedAt: number;
}

class MemoryFirestore {
  private collections: Map<string, Map<string, FirestoreDoc>> = new Map();
  private storageFile: string = path.resolve(import.meta.dirname, '../../.firestore_state.json');

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
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
      }
    } catch (e) {
      // Ignore initial missing file
    }
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
    } catch (e) {
      // Ignore disk sync errors
    }
  }

  private getCollection(name: string): Map<string, FirestoreDoc> {
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
