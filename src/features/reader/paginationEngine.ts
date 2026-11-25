export interface PaginatedLayoutInput {
  viewportWidth: number;
  viewportHeight: number;
  paddingX: number;
  maxWidth: number;
  columnGap: number;
  twoColumnOnWide: boolean;
}

export interface PaginatedLayout {
  columns: 1 | 2;
  effectivePaddingX: number;
  innerWidth: number;
  columnWidth: number;
  stepPx: number;
}

/** Minimum usable text column; guards ultra-narrow viewports from negative width. */
const MIN_INNER_WIDTH = 160;

function clampPadding(viewportWidth: number, desired: number): number {
  const maxPadding = Math.max(
    0,
    Math.floor((viewportWidth - MIN_INNER_WIDTH) / 2)
  );
  return Math.max(0, Math.min(Math.round(desired), maxPadding));
}

export function computePaginatedLayout(
  input: PaginatedLayoutInput
): PaginatedLayout {
  const vw = Math.max(0, input.viewportWidth);
  const vh = Math.max(0, input.viewportHeight);
  const columns: 1 | 2 =
    input.twoColumnOnWide && vw >= 1024 && vw > vh ? 2 : 1;

  const desiredPadding =
    columns === 1
      ? Math.max(input.paddingX, Math.floor((vw - input.maxWidth) / 2))
      : input.paddingX;
  const effectivePaddingX = clampPadding(vw, desiredPadding);
  const innerWidth = Math.max(0, vw - effectivePaddingX * 2);
  const gap = Math.max(0, input.columnGap);
  const columnWidth =
    columns === 2 ? Math.max(1, Math.floor((innerWidth - gap) / 2)) : innerWidth;

  return {
    columns,
    effectivePaddingX,
    innerWidth,
    columnWidth,
    stepPx: innerWidth + gap,
  };
}

export function computeTotalPages(
  contentRightPx: number,
  scrollWidth: number,
  columnGap: number,
  stepPx: number
): number {
  if (!Number.isFinite(stepPx) || stepPx <= 0) return 1;
  const scroll = Number.isFinite(scrollWidth) ? Math.max(0, scrollWidth) : 0;
  const effectiveRight =
    contentRightPx > 0
      ? Math.min(scroll, Math.max(contentRightPx, stepPx - columnGap))
      : scroll;
  return Math.max(1, Math.ceil((effectiveRight + columnGap - 2) / stepPx));
}

/**
 * Map a UTF-16 offset inside a paragraph's rendered text onto the backend's
 * monotonically increasing character span. Exact 1:1 when lengths agree;
 * proportionally scaled otherwise so nested markup/cropping cannot desync.
 */
export function mapTextOffsetToCharPos(
  textOffset: number,
  textLength: number,
  spanStart: number,
  spanEnd: number
): number {
  const spanLength = Math.max(0, spanEnd - spanStart);
  if (spanLength === 0 || textLength <= 0) return spanStart;
  if (textOffset <= 0) return spanStart;
  if (textOffset >= textLength) return spanEnd;
  if (textLength === spanLength) return spanStart + textOffset;
  const ratio = textOffset / textLength;
  return Math.min(
    spanEnd,
    Math.max(spanStart, spanStart + Math.round(ratio * spanLength))
  );
}

export function mapCharPosToTextOffset(
  charPos: number,
  textLength: number,
  spanStart: number,
  spanEnd: number
): number {
  const spanLength = Math.max(0, spanEnd - spanStart);
  if (spanLength === 0 || textLength <= 0) return 0;
  if (charPos <= spanStart) return 0;
  if (charPos >= spanEnd) return textLength;
  if (textLength === spanLength) return charPos - spanStart;
  const ratio = (charPos - spanStart) / spanLength;
  return Math.min(textLength, Math.max(0, Math.round(ratio * textLength)));
}

function collectTextNodes(root: Node): Text[] {
  const doc = root.ownerDocument;
  if (!doc) return [];
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const out: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    const text = current as Text;
    if ((text.nodeValue?.length ?? 0) > 0) out.push(text);
    current = walker.nextNode();
  }
  return out;
}

function createCharRect(
  node: Text,
  index: number,
  length: number
): DOMRect | null {
  const start = Math.max(0, Math.min(length, index));
  const end = Math.min(length, start + 1);
  if (end <= start) return null;
  const doc = node.ownerDocument;
  if (!doc) return null;
  const range = doc.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const rects = range.getClientRects();
  if (rects.length > 0) return rects[0];
  const rect = range.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0 ? rect : null;
}

function isLowSurrogateAt(node: Text, index: number): boolean {
  const value = node.nodeValue ?? '';
  if (index <= 0 || index >= value.length) return false;
  const code = value.charCodeAt(index);
  return code >= 0xdc00 && code <= 0xdfff;
}

/** First character index whose rendered left edge reaches the page's left edge. */
function findFirstCharInPage(
  node: Text,
  length: number,
  pageLeft: number,
  trackLeft: number
): number {
  let low = 0;
  let high = length;
  while (low < high) {
    const mid = (low + high) >> 1;
    const rect = createCharRect(node, mid, length);
    // No geometry for this char: keep scanning forward.
    const left = rect ? rect.left - trackLeft : -Infinity;
    if (left >= pageLeft - 2) high = mid;
    else low = mid + 1;
  }
  let index = low;
  if (isLowSurrogateAt(node, index)) index = Math.max(0, index - 1);
  // Skip a leading char that only clips the page boundary.
  while (index < length) {
    const rect = createCharRect(node, index, length);
    if (!rect) {
      index += 1;
      continue;
    }
    if (
      rect.left - trackLeft >= pageLeft - 2 &&
      rect.right - trackLeft > pageLeft + 2
    ) {
      break;
    }
    index += 1;
  }
  return index;
}

export function resolvePageCharPos(
  track: HTMLElement | null,
  targetPage: number,
  stepPx: number,
  fallbackCharPos: number
): number {
  if (!track || stepPx <= 0) {
    return targetPage <= 0 ? 0 : Math.max(0, fallbackCharPos);
  }
  const trackLeft = track.getBoundingClientRect().left;
  const pageLeft = Math.max(0, targetPage) * stepPx;
  const pageRight = pageLeft + stepPx;
  const nodes = Array.from(
    track.querySelectorAll<HTMLElement>('[data-start]')
  );
  let lastStart = 0;

  for (const node of nodes) {
    const start = Number(node.dataset.start);
    if (Number.isFinite(start)) lastStart = start;

    const visible = Array.from(node.getClientRects()).some((rect) => {
      const left = rect.left - trackLeft;
      const right = rect.right - trackLeft;
      return right >= pageLeft + 4 && left < pageRight - 2;
    });
    if (!visible) continue;

    const spanStart = Number.isFinite(start) ? start : 0;
    const spanEnd = Number(node.dataset.end);
    const textNodes = collectTextNodes(node);
    if (textNodes.length === 0) {
      // Pure image paragraph: its backend offset is the anchor.
      return spanStart;
    }

    const totalTextLength = textNodes.reduce(
      (sum, text) => sum + (text.nodeValue?.length ?? 0),
      0
    );
    let consumed = 0;
    for (const text of textNodes) {
      const length = text.nodeValue?.length ?? 0;
      if (length <= 0) continue;
      const charIndex = findFirstCharInPage(
        text,
        length,
        pageLeft,
        trackLeft
      );
      if (charIndex < length) {
        return mapTextOffsetToCharPos(
          consumed + charIndex,
          totalTextLength,
          spanStart,
          Number.isFinite(spanEnd) ? spanEnd : spanStart + totalTextLength
        );
      }
      consumed += length;
    }
    return spanStart;
  }

  if (targetPage <= 0) return 0;
  if (Number.isFinite(fallbackCharPos) && fallbackCharPos > 0) {
    return fallbackCharPos;
  }
  return lastStart;
}

export function resolveCharPosPage(
  track: HTMLElement | null,
  charPos: number,
  stepPx: number,
  totalPages: number
): number {
  const maxPage = Math.max(0, totalPages - 1);
  if (!track || stepPx <= 0) return 0;
  if (!Number.isFinite(charPos) || charPos <= 0) return 0;

  const nodes = Array.from(
    track.querySelectorAll<HTMLElement>('[data-start]')
  );
  if (nodes.length === 0) return 0;

  const lastNode = nodes[nodes.length - 1];
  const lastEnd = Number(lastNode.dataset.end);
  if (Number.isFinite(lastEnd) && charPos > lastEnd) return maxPage;

  let target: HTMLElement | null = null;
  for (const node of nodes) {
    const start = Number(node.dataset.start);
    const end = Number(node.dataset.end);
    if (charPos >= start && charPos < end) {
      target = node;
      break;
    }
    if (Number.isFinite(start) && start >= charPos) {
      target = node;
      break;
    }
  }
  if (!target) target = lastNode;

  const trackLeft = track.getBoundingClientRect().left;
  const start = Number(target.dataset.start);
  const end = Number(target.dataset.end);
  const spanStart = Number.isFinite(start) ? start : 0;
  const spanEnd = Number.isFinite(end) ? end : spanStart;
  let charLeft: number | null = null;

  const textNodes = collectTextNodes(target);
  if (textNodes.length > 0 && charPos > spanStart) {
    const textLength = textNodes.reduce(
      (sum, text) => sum + (text.nodeValue?.length ?? 0),
      0
    );
    const offset = mapCharPosToTextOffset(
      charPos,
      textLength,
      spanStart,
      spanEnd
    );
    let consumed = 0;
    for (const text of textNodes) {
      const length = text.nodeValue?.length ?? 0;
      if (offset <= consumed + length) {
        let local = Math.max(0, Math.min(length, offset - consumed));
        if (local >= length && length > 0) local = length - 1;
        if (isLowSurrogateAt(text, local)) local = Math.max(0, local - 1);
        const rect = createCharRect(text, local, length);
        if (rect) charLeft = rect.left - trackLeft;
        break;
      }
      consumed += length;
    }
  }

  if (charLeft === null) {
    const rects = Array.from(target.getClientRects());
    const rect =
      rects.find((r) => r.width > 0 || r.height > 0) ??
      target.getBoundingClientRect();
    charLeft = rect.left - trackLeft;
  }

  const page = Math.floor(Math.max(0, charLeft + 2) / stepPx);
  return Math.max(0, Math.min(maxPage, page));
}

export function measureContentRightEdge(track: HTMLElement | null): number {
  if (!track) return 0;
  const trackLeft = track.getBoundingClientRect().left;
  let maxRight = 0;
  const nodes = track.querySelectorAll<HTMLElement>(
    'h1, [data-start], img'
  );
  for (const node of nodes) {
    for (const rect of Array.from(node.getClientRects())) {
      if (rect.width <= 0 && rect.height <= 0) continue;
      maxRight = Math.max(maxRight, rect.right - trackLeft);
    }
  }
  return maxRight;
}
