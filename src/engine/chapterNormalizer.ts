import { buildImageProxyUrl } from '@/api/media';
import { isReaderWebChapter } from '@/api/client';
import type {
  EndpointConfig,
  NormalizedChapter,
  NormalizedParagraph,
  ReaderWebChapter,
} from '@/api/types';

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'span',
  'em',
  'strong',
  'i',
  'b',
  'u',
  's',
  'sub',
  'sup',
  'ruby',
  'rt',
  'rp',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'img',
]);

const DROP_SUBTREE_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'noscript',
  'template',
  'form',
  'input',
  'textarea',
  'button',
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isUnsafeUrl(value: string): boolean {
  const cleaned = value.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
  if (
    cleaned.startsWith('javascript:') ||
    cleaned.startsWith('vbscript:') ||
    cleaned.startsWith('data:text/html')
  ) {
    return true;
  }
  return false;
}

export interface NormalizeChapterOptions {
  bookUrl: string;
  endpoint: EndpointConfig;
  chapterTitle: string;
  targetImgWidth?: number;
  originOverride?: string;
}

function sanitizeFragment(
  html: string,
  options: NormalizeChapterOptions
): { html: string; hasImage: boolean } {
  if (!html) return { html: '', hasImage: false };

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return { html: '', hasImage: false };

  let hasImage = false;
  const outDoc = document.implementation.createHTMLDocument('');
  const container = outDoc.createElement('div');

  const walk = (source: Node, target: Node) => {
    for (const child of Array.from(source.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        target.appendChild(outDoc.createTextNode(child.textContent ?? ''));
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (DROP_SUBTREE_TAGS.has(tag)) {
        continue;
      }

      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap disallowed formatting containers while preserving safe children
        walk(el, target);
        continue;
      }

      if (tag === 'img') {
        const rawSrc = (el.getAttribute('src') || '').trim();
        if (!rawSrc || isUnsafeUrl(rawSrc)) continue;
        hasImage = true;
        const img = outDoc.createElement('img');
        const proxied = rawSrc.startsWith('data:image/')
          ? rawSrc
          : buildImageProxyUrl(
              options.endpoint,
              options.bookUrl,
              rawSrc,
              options.targetImgWidth,
              options.originOverride
            );
        img.setAttribute('src', proxied);
        const alt = el.getAttribute('alt');
        if (alt) img.setAttribute('alt', alt);
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
        target.appendChild(img);
        continue;
      }

      // Flatten nested <p> inside semantic paragraph so output stays clean inside outer <p>
      if (tag === 'p' && target === container) {
        walk(el, target);
        continue;
      }

      const clone = outDoc.createElement(tag);
      walk(el, clone);
      target.appendChild(clone);
    }
  };

  walk(root, container);
  return { html: container.innerHTML.trim(), hasImage };
}

function normalizePlainText(
  text: string,
  chapterTitle: string
): NormalizedChapter {
  const normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const paragraphs: NormalizedParagraph[] = [];
  let cursor = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const start = cursor;
    const endExclusive = start + line.length;
    // Advance past '\n' separator to keep monotonic non-overlapping UTF-16 spans
    cursor = endExclusive + (i < lines.length - 1 ? 1 : 0);

    const trimmed = line.trim();
    if (!trimmed) continue;

    paragraphs.push({
      html: escapeHtml(trimmed),
      start,
      endExclusive,
      hasImage: false,
    });
  }

  return {
    title: chapterTitle,
    characterCount: normalized.length,
    paragraphs,
    isSemantic: false,
  };
}

export function normalizeChapter(
  raw: ReaderWebChapter | string,
  options: NormalizeChapterOptions
): NormalizedChapter {
  if (!isReaderWebChapter(raw)) {
    return normalizePlainText(typeof raw === 'string' ? raw : '', options.chapterTitle);
  }

  const paragraphs: NormalizedParagraph[] = [];
  let lastEnd = 0;

  for (const para of raw.paragraphs) {
    const { html, hasImage } = sanitizeFragment(para.html, options);
    if (!html && !hasImage) continue;

    const start = Math.max(lastEnd, Number.isFinite(para.start) ? para.start : lastEnd);
    const endExclusive = Math.max(
      start,
      Number.isFinite(para.endExclusive) ? para.endExclusive : start
    );
    lastEnd = endExclusive;

    paragraphs.push({
      html,
      start,
      endExclusive,
      hasImage,
    });
  }

  const characterCount =
    Number.isFinite(raw.characterCount) && raw.characterCount > 0
      ? raw.characterCount
      : lastEnd;

  return {
    title: raw.title || options.chapterTitle,
    characterCount,
    paragraphs,
    isSemantic: true,
  };
}
