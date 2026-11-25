import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computePaginatedLayout,
  computeTotalPages,
  mapCharPosToTextOffset,
  mapTextOffsetToCharPos,
  measureContentRightEdge,
  resolveCharPosPage,
  resolvePageCharPos,
} from '@/features/reader/paginationEngine';

interface RectSpec {
  left: number;
  right: number;
  top?: number;
  bottom?: number;
}

function toRect(spec: RectSpec): DOMRect {
  const top = spec.top ?? 0;
  const bottom = spec.bottom ?? 20;
  return {
    left: spec.left,
    right: spec.right,
    top,
    bottom,
    width: spec.right - spec.left,
    height: bottom - top,
    x: spec.left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function unionRect(specs: RectSpec[]): DOMRect {
  if (specs.length === 0) return toRect({ left: 0, right: 0 });
  return toRect({
    left: Math.min(...specs.map((s) => s.left)),
    right: Math.max(...specs.map((s) => s.right)),
    top: Math.min(...specs.map((s) => s.top ?? 0)),
    bottom: Math.max(...specs.map((s) => s.bottom ?? 20)),
  });
}

interface ParagraphSpec {
  start: number;
  end: number;
  text?: string;
  rects: RectSpec[];
  charRects?: RectSpec[];
}

function buildTrack(paragraphs: ParagraphSpec[]): HTMLElement {
  const track = document.createElement('div');
  for (const spec of paragraphs) {
    const p = document.createElement('p');
    p.dataset.start = String(spec.start);
    p.dataset.end = String(spec.end);
    p.getClientRects = () =>
      spec.rects.map(toRect) as unknown as DOMRectList;
    p.getBoundingClientRect = () => unionRect(spec.rects);
    if (spec.text !== undefined) {
      const textNode = document.createTextNode(spec.text);
      (textNode as unknown as { __charRects?: RectSpec[] }).__charRects =
        spec.charRects ?? spec.text.split('').map(() => spec.rects[0]);
      p.appendChild(textNode);
    }
    track.appendChild(p);
  }
  track.getBoundingClientRect = () => toRect({ left: 0, right: 0 });
  return track;
}

beforeEach(() => {
  vi.spyOn(document, 'createRange').mockImplementation(() => {
    let node: Node | null = null;
    let offset = 0;
    const range = {
      setStart(n: Node, o: number) {
        node = n;
        offset = o;
      },
      setEnd() {},
      getClientRects() {
        const rects = (node as unknown as { __charRects?: RectSpec[] })
          ?.__charRects;
        const spec = rects?.[offset];
        return (spec ? [toRect(spec)] : []) as unknown as DOMRectList;
      },
      getBoundingClientRect() {
        const rects = this.getClientRects();
        return rects[0] ?? toRect({ left: 0, right: 0 });
      },
    };
    return range as unknown as Range;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('computePaginatedLayout', () => {
  it('uses two columns on a wide landscape viewport', () => {
    const layout = computePaginatedLayout({
      viewportWidth: 1280,
      viewportHeight: 800,
      paddingX: 32,
      maxWidth: 720,
      columnGap: 48,
      twoColumnOnWide: true,
    });
    expect(layout.columns).toBe(2);
    expect(layout.effectivePaddingX).toBe(32);
    expect(layout.innerWidth).toBe(1216);
    expect(layout.columnWidth).toBe(584);
    expect(layout.stepPx).toBe(1264);
  });

  it('centers a single column at maxWidth on a wide non-landscape viewport', () => {
    const layout = computePaginatedLayout({
      viewportWidth: 1280,
      viewportHeight: 1280,
      paddingX: 32,
      maxWidth: 720,
      columnGap: 48,
      twoColumnOnWide: true,
    });
    expect(layout.columns).toBe(1);
    expect(layout.effectivePaddingX).toBe(280);
    expect(layout.innerWidth).toBe(720);
    expect(layout.columnWidth).toBe(720);
    expect(layout.stepPx).toBe(768);
  });

  it('clamps horizontal padding on ultra-narrow viewports so innerWidth stays positive', () => {
    const layout = computePaginatedLayout({
      viewportWidth: 200,
      viewportHeight: 700,
      paddingX: 32,
      maxWidth: 720,
      columnGap: 48,
      twoColumnOnWide: true,
    });
    expect(layout.columns).toBe(1);
    expect(layout.effectivePaddingX).toBe(20);
    expect(layout.innerWidth).toBe(160);
    expect(layout.innerWidth).toBe(200 - layout.effectivePaddingX * 2);
  });
});

describe('computeTotalPages', () => {
  it('counts pages from the measured content right edge', () => {
    expect(computeTotalPages(9900, 10000, 48, 1264)).toBe(8);
  });

  it('does not emit a blank page from trailing margin', () => {
    expect(computeTotalPages(2480, 10000, 48, 1264)).toBe(2);
  });

  it('always returns at least one page', () => {
    expect(computeTotalPages(0, 0, 48, 1264)).toBe(1);
  });
});

describe('text offset mapping', () => {
  it('maps 1:1 when text and span lengths agree', () => {
    expect(mapTextOffsetToCharPos(50, 100, 1000, 1100)).toBe(1050);
    expect(mapCharPosToTextOffset(1050, 100, 1000, 1100)).toBe(50);
  });

  it('maps proportionally and clamps at both edges', () => {
    expect(mapTextOffsetToCharPos(40, 80, 1000, 1100)).toBe(1050);
    expect(mapCharPosToTextOffset(1050, 80, 1000, 1100)).toBe(40);
    expect(mapTextOffsetToCharPos(-5, 80, 1000, 1100)).toBe(1000);
    expect(mapTextOffsetToCharPos(200, 80, 1000, 1100)).toBe(1100);
    expect(mapCharPosToTextOffset(900, 80, 1000, 1100)).toBe(0);
    expect(mapCharPosToTextOffset(2000, 80, 1000, 1100)).toBe(80);
  });
});

describe('resolvePageCharPos', () => {
  const splitParagraph: ParagraphSpec = {
    start: 0,
    end: 10,
    text: 'ABCDEFGHIJ',
    rects: [
      { left: 0, right: 50 },
      { left: 100, right: 150 },
    ],
    charRects: [
      { left: 0, right: 10 },
      { left: 10, right: 20 },
      { left: 20, right: 30 },
      { left: 30, right: 40 },
      { left: 40, right: 50 },
      { left: 100, right: 110 },
      { left: 110, right: 120 },
      { left: 120, right: 130 },
      { left: 130, right: 140 },
      { left: 140, right: 150 },
    ],
  };

  it('resolves the first visible character of a paragraph split across columns', () => {
    const track = buildTrack([splitParagraph]);
    // Page 1 starts at 100px: the paragraph starts in column 0, so the old
    // paragraph-level logic would have returned 0 (chapter start).
    expect(resolvePageCharPos(track, 1, 100, 0)).toBe(5);
    expect(resolvePageCharPos(track, 0, 100, 0)).toBe(0);
  });

  it('returns the image paragraph offset for textless content', () => {
    const track = buildTrack([
      { start: 500, end: 500, rects: [{ left: 100, right: 300 }] },
    ]);
    expect(resolvePageCharPos(track, 1, 100, 0)).toBe(500);
  });

  it('keeps the fallback instead of silently returning 0 on an empty page', () => {
    const track = buildTrack([
      { start: 0, end: 10, rects: [{ left: 0, right: 50 }] },
    ]);
    expect(resolvePageCharPos(track, 2, 100, 42)).toBe(42);
    expect(resolvePageCharPos(track, 0, 100, 42)).toBe(0);
  });
});

describe('resolveCharPosPage', () => {
  it('converts a character position to its page', () => {
    const track = buildTrack([{
      start: 0,
      end: 10,
      text: 'ABCDEFGHIJ',
      rects: [
        { left: 0, right: 50 },
        { left: 100, right: 150 },
      ],
      charRects: [
        { left: 0, right: 10 },
        { left: 10, right: 20 },
        { left: 20, right: 30 },
        { left: 30, right: 40 },
        { left: 40, right: 50 },
        { left: 100, right: 110 },
        { left: 110, right: 120 },
        { left: 120, right: 130 },
        { left: 130, right: 140 },
        { left: 140, right: 150 },
      ],
    }]);
    expect(resolveCharPosPage(track, 5, 100, 2)).toBe(1);
    expect(resolveCharPosPage(track, 0, 100, 2)).toBe(0);
  });

  it('clamps positions past the chapter end to the last page, not page 0', () => {
    const track = buildTrack([
      { start: 0, end: 10, text: 'abc', rects: [{ left: 0, right: 40 }] },
    ]);
    expect(resolveCharPosPage(track, 20, 100, 4)).toBe(3);
  });
});

describe('measureContentRightEdge', () => {
  it('returns the furthest right edge of headings and paragraphs', () => {
    const track = buildTrack([
      { start: 0, end: 10, text: 'abc', rects: [{ left: 0, right: 584 }] },
    ]);
    const heading = document.createElement('h1');
    heading.getClientRects = () =>
      [toRect({ left: 0, right: 600 })] as unknown as DOMRectList;
    track.appendChild(heading);
    expect(measureContentRightEdge(track)).toBe(600);
  });
});
