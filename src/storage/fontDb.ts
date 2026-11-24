export interface StoredFontMeta {
  id: string;
  name: string;
  family: string;
  fileName: string;
  format: 'ttf' | 'otf' | 'woff' | 'woff2';
  size: number;
  addedAt: number;
}

export interface StoredFontRecord extends StoredFontMeta {
  buffer: ArrayBuffer;
}

const DB_NAME = 'legado-web-db';
const DB_VERSION = 1;
const STORE_NAME = 'fonts';

export interface FontDbAdapter {
  listFontsMeta(): Promise<StoredFontMeta[]>;
  getFontBuffer(id: string): Promise<ArrayBuffer | null>;
  getFontRecord(id: string): Promise<StoredFontRecord | null>;
  putFont(record: StoredFontRecord): Promise<void>;
  deleteFont(id: string): Promise<void>;
  getTotalFontBytes(): Promise<number>;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持 IndexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('无法打开本地字体库'));
  });
}

function stripBuffer(rec: StoredFontRecord): StoredFontMeta {
  return {
    id: rec.id,
    name: rec.name,
    family: rec.family,
    fileName: rec.fileName,
    format: rec.format,
    size: rec.size,
    addedAt: rec.addedAt,
  };
}

export const indexedDbFontAdapter: FontDbAdapter = {
  async listFontsMeta(): Promise<StoredFontMeta[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result as StoredFontRecord[]) || [];
        rows.sort((a, b) => a.addedAt - b.addedAt);
        resolve(rows.map(stripBuffer));
      };
      req.onerror = () => reject(req.error ?? new Error('读取字体列表失败'));
      tx.oncomplete = () => db.close();
    });
  },

  async getFontRecord(id: string): Promise<StoredFontRecord | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve((req.result as StoredFontRecord) ?? null);
      req.onerror = () => reject(req.error ?? new Error('读取字体失败'));
      tx.oncomplete = () => db.close();
    });
  },

  async getFontBuffer(id: string): Promise<ArrayBuffer | null> {
    const rec = await this.getFontRecord(id);
    return rec ? rec.buffer : null;
  },

  async putFont(record: StoredFontRecord): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('写入字体库失败'));
      };
    });
  },

  async deleteFont(id: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('删除字体失败'));
      };
    });
  },

  async getTotalFontBytes(): Promise<number> {
    const list = await this.listFontsMeta();
    return list.reduce((sum, item) => sum + (item.size || 0), 0);
  },
};
