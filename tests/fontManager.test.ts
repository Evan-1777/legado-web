import { describe, expect, it } from 'vitest';
import type {
  FontDbAdapter,
  StoredFontMeta,
  StoredFontRecord,
} from '@/storage/fontDb';
import {
  createFontManager,
  parseFontExtension,
  type FontFaceLike,
  type FontRuntime,
} from '@/storage/fontManager';

function createMockDb(): FontDbAdapter {
  const store = new Map<string, StoredFontRecord>();
  return {
    async listFontsMeta(): Promise<StoredFontMeta[]> {
      return Array.from(store.values()).map(({ buffer: _b, ...meta }) => meta);
    },
    async getFontRecord(id: string): Promise<StoredFontRecord | null> {
      return store.get(id) ?? null;
    },
    async getFontBuffer(id: string): Promise<ArrayBuffer | null> {
      return store.get(id)?.buffer ?? null;
    },
    async putFont(record: StoredFontRecord): Promise<void> {
      store.set(record.id, record);
    },
    async deleteFont(id: string): Promise<void> {
      store.delete(id);
    },
    async getTotalFontBytes(): Promise<number> {
      let sum = 0;
      for (const r of store.values()) sum += r.size;
      return sum;
    },
  };
}

function createMockRuntime() {
  const registered = new Set<FontFaceLike>();
  const runtime: FontRuntime = {
    createFontFace(family: string, _source: ArrayBuffer): FontFaceLike {
      const face: FontFaceLike = {
        family,
        async load() {
          return face;
        },
      };
      return face;
    },
    addFace(face: FontFaceLike) {
      registered.add(face);
    },
    deleteFace(face: FontFaceLike) {
      registered.delete(face);
    },
  };
  return { runtime, registered };
}

function createFakeFontFile(name: string, byteLength = 64): File {
  const bytes = new Uint8Array(byteLength).fill(7);
  return {
    name,
    size: byteLength,
    arrayBuffer: async () => bytes.buffer.slice(0),
  } as unknown as File;
}

describe('fontManager', () => {
  it('validates allowed font file extensions', () => {
    expect(parseFontExtension('LXGW-WenKai.ttf')).toBe('ttf');
    expect(parseFontExtension('SourceHanSerif.OTF')).toBe('otf');
    expect(parseFontExtension('book.woff2')).toBe('woff2');
    expect(parseFontExtension('notes.txt')).toBeNull();
    expect(parseFontExtension('noext')).toBeNull();
  });

  it('persists imported font, restores after reload, and cleans up on delete', async () => {
    const db = createMockDb();
    const { runtime, registered } = createMockRuntime();
    const manager = createFontManager(db, runtime);

    await expect(
      manager.importFontFile(createFakeFontFile('bad.exe', 32))
    ).rejects.toThrow('仅支持');

    await expect(
      manager.importFontFile(createFakeFontFile('empty.ttf', 0))
    ).rejects.toThrow('为空');

    const meta = await manager.importFontFile(
      createFakeFontFile('霞鹜文楷.woff2', 2048)
    );
    expect(meta.name).toBe('霞鹜文楷');
    expect(meta.format).toBe('woff2');
    expect(meta.size).toBe(2048);
    expect(registered.size).toBe(1);
    expect(await manager.getTotalBytes()).toBe(2048);

    // Simulate browser page reload by clearing memory cache
    manager.clearMemoryCache();
    expect(registered.size).toBe(0);
    expect(manager.isLoaded(meta.id)).toBe(false);

    // Hydrate persisted active font from IndexedDB
    const ok = await manager.hydrateActiveFont(meta.id);
    expect(ok).toBe(true);
    expect(registered.size).toBe(1);
    expect(manager.isLoaded(meta.id)).toBe(true);

    // Remove font cleans both DB and FontFace registry
    await manager.removeFont(meta.id);
    expect(registered.size).toBe(0);
    expect(await manager.listFonts()).toEqual([]);
    expect(await manager.getTotalBytes()).toBe(0);
  });
});
