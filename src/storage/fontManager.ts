import {
  indexedDbFontAdapter,
  type FontDbAdapter,
  type StoredFontMeta,
  type StoredFontRecord,
} from './fontDb';

export interface BuiltinFontOption {
  id: 'sys-serif' | 'sys-sans' | 'sys-kai';
  name: string;
  cssFamily: string;
}

export const BUILTIN_FONTS: BuiltinFontOption[] = [
  { id: 'sys-serif', name: '宋体', cssFamily: 'var(--font-serif)' },
  { id: 'sys-sans', name: '黑体', cssFamily: 'var(--font-sans)' },
  { id: 'sys-kai', name: '楷体', cssFamily: 'var(--font-kai)' },
];

export const DEFAULT_FONT_ID = 'sys-serif';

const VALID_EXT = new Set<StoredFontMeta['format']>(['ttf', 'otf', 'woff', 'woff2']);

export function parseFontExtension(
  fileName: string
): StoredFontMeta['format'] | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  if (!match) return null;
  const ext = match[1].toLowerCase() as StoredFontMeta['format'];
  return VALID_EXT.has(ext) ? ext : null;
}

export function isBuiltinFontId(fontId: string): boolean {
  return BUILTIN_FONTS.some((f) => f.id === fontId);
}

export function resolveFontCssFamily(
  fontId: string,
  customFonts: StoredFontMeta[]
): string {
  const builtin = BUILTIN_FONTS.find((f) => f.id === fontId);
  if (builtin) return builtin.cssFamily;
  const custom = customFonts.find((f) => f.id === fontId);
  if (custom) {
    return `"${custom.family}", var(--font-serif)`;
  }
  return BUILTIN_FONTS[0].cssFamily;
}

export interface FontFaceLike {
  family: string;
  load(): Promise<FontFaceLike>;
}

export interface FontRuntime {
  createFontFace(family: string, source: ArrayBuffer): FontFaceLike;
  addFace(face: FontFaceLike): void;
  deleteFace(face: FontFaceLike): void;
}

const defaultFontRuntime: FontRuntime = {
  createFontFace(family, source) {
    if (typeof FontFace === 'undefined') {
      throw new Error('当前浏览器不支持 FontFace API');
    }
    return new FontFace(family, source);
  },
  addFace(face) {
    document.fonts.add(face as unknown as FontFace);
  },
  deleteFace(face) {
    document.fonts.delete(face as unknown as FontFace);
  },
};

export function createFontManager(
  db: FontDbAdapter = indexedDbFontAdapter,
  runtime: FontRuntime = defaultFontRuntime
) {
  const loadedFaces = new Map<string, FontFaceLike>();
  const inflight = new Map<string, Promise<boolean>>();

  return {
    async listFonts(): Promise<StoredFontMeta[]> {
      return db.listFontsMeta();
    },

    async getTotalBytes(): Promise<number> {
      return db.getTotalFontBytes();
    },

    async importFontFile(file: File): Promise<StoredFontMeta> {
      const format = parseFontExtension(file.name);
      if (!format) {
        throw new Error('仅支持 .ttf、.otf、.woff、.woff2 字体文件');
      }

      const buffer = await file.arrayBuffer();
      if (buffer.byteLength === 0) {
        throw new Error('字体文件为空');
      }

      const baseName = file.name.replace(/\.[^.]+$/, '').trim() || '自定义字体';
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const family = `LegadoFont_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`;

      // Validate parseability before persisting to IndexedDB
      const face = runtime.createFontFace(family, buffer.slice(0));
      const loaded = await face.load();
      runtime.addFace(loaded);

      const record: StoredFontRecord = {
        id,
        name: baseName,
        family,
        fileName: file.name,
        format,
        size: buffer.byteLength,
        addedAt: Date.now(),
        buffer,
      };

      try {
        await db.putFont(record);
      } catch (err) {
        runtime.deleteFace(loaded);
        throw err;
      }

      loadedFaces.set(id, loaded);
      const { buffer: _ignored, ...meta } = record;
      return meta;
    },

    async ensureFontLoaded(fontId: string): Promise<boolean> {
      if (isBuiltinFontId(fontId)) return true;
      if (loadedFaces.has(fontId)) return true;

      const existing = inflight.get(fontId);
      if (existing) return existing;

      const task = (async () => {
        try {
          const rec = await db.getFontRecord(fontId);
          if (!rec) return false;
          const face = runtime.createFontFace(rec.family, rec.buffer.slice(0));
          const loaded = await face.load();
          runtime.addFace(loaded);
          loadedFaces.set(fontId, loaded);
          return true;
        } catch {
          return false;
        } finally {
          inflight.delete(fontId);
        }
      })();

      inflight.set(fontId, task);
      return task;
    },

    async hydrateActiveFont(activeFontId: string): Promise<boolean> {
      if (!activeFontId || isBuiltinFontId(activeFontId)) return true;
      return this.ensureFontLoaded(activeFontId);
    },

    async removeFont(fontId: string): Promise<void> {
      const face = loadedFaces.get(fontId);
      if (face) {
        runtime.deleteFace(face);
        loadedFaces.delete(fontId);
      }
      await db.deleteFont(fontId);
    },

    clearMemoryCache(): void {
      for (const face of loadedFaces.values()) {
        runtime.deleteFace(face);
      }
      loadedFaces.clear();
      inflight.clear();
    },

    isLoaded(fontId: string): boolean {
      return isBuiltinFontId(fontId) || loadedFaces.has(fontId);
    },
  };
}

export const fontManager = createFontManager();
