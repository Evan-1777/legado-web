import { resolveHttpUrl } from './endpoint';
import type { Book, EndpointConfig, SearchBook } from './types';

export interface TypographicCoverTheme {
  bg: string;
  fg: string;
  accent: string;
  border: string;
}

const COVER_THEMES: TypographicCoverTheme[] = [
  {
    bg: 'linear-gradient(160deg, #1b2434 0%, #0e141f 100%)',
    fg: '#edf1f7',
    accent: 'rgba(180, 206, 240, 0.42)',
    border: 'rgba(255, 255, 255, 0.14)',
  },
  {
    bg: 'linear-gradient(160deg, #f3ebdc 0%, #e4d6bc 100%)',
    fg: '#2e2318',
    accent: 'rgba(116, 86, 52, 0.36)',
    border: 'rgba(56, 42, 26, 0.12)',
  },
  {
    bg: 'linear-gradient(160deg, #273832 0%, #16221e 100%)',
    fg: '#e8f1ec',
    accent: 'rgba(165, 212, 192, 0.4)',
    border: 'rgba(255, 255, 255, 0.12)',
  },
  {
    bg: 'linear-gradient(160deg, #4b232a 0%, #2a1116 100%)',
    fg: '#f7ecec',
    accent: 'rgba(240, 186, 192, 0.38)',
    border: 'rgba(255, 255, 255, 0.12)',
  },
  {
    bg: 'linear-gradient(160deg, #353740 0%, #1e1f25 100%)',
    fg: '#f1f2f5',
    accent: 'rgba(196, 200, 212, 0.38)',
    border: 'rgba(255, 255, 255, 0.12)',
  },
  {
    bg: 'linear-gradient(160deg, #eae6de 0%, #d8d1c5 100%)',
    fg: '#262420',
    accent: 'rgba(72, 66, 58, 0.32)',
    border: 'rgba(38, 36, 32, 0.12)',
  },
];

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getTypographicCoverTheme(
  name: string,
  author = ''
): TypographicCoverTheme {
  const idx = hashString(`${name}::${author}`) % COVER_THEMES.length;
  return COVER_THEMES[idx];
}

export function buildCoverProxyUrl(
  endpoint: EndpointConfig,
  coverPath: string,
  originOverride?: string
): string {
  return resolveHttpUrl(endpoint, '/cover', { path: coverPath }, originOverride);
}

export function buildImageProxyUrl(
  endpoint: EndpointConfig,
  bookUrl: string,
  src: string,
  width?: number,
  originOverride?: string
): string {
  const safeWidth =
    typeof width === 'number' && Number.isFinite(width) && width > 0
      ? Math.round(width)
      : undefined;
  return resolveHttpUrl(
    endpoint,
    '/image',
    { url: bookUrl, path: src, width: safeWidth },
    originOverride
  );
}

export interface CoverCandidate {
  url: string;
  source: 'direct' | 'proxy';
  noReferrer: boolean;
}

/**
 * 3-tier cover resolution:
 * 1. Direct high-res remote URL (when safe against Mixed Content)
 * 2. Backend /cover?path=... fallback (84x112 thumbnail, handles local/auth covers)
 * 3. Typographic editorial cover rendered when candidates are exhausted
 */
export function resolveCoverCandidates(
  book: Pick<Book | SearchBook, 'coverUrl'> & { customCoverUrl?: string },
  endpoint: EndpointConfig,
  pageProtocol?: string,
  originOverride?: string
): CoverCandidate[] {
  const raw = (book.customCoverUrl || book.coverUrl || '').trim();
  if (!raw) return [];

  const proto =
    pageProtocol ??
    (typeof window !== 'undefined' ? window.location.protocol : 'http:');

  const candidates: CoverCandidate[] = [];
  const isHttpRemote = /^https?:\/\//i.test(raw);
  const isHttpsRemote = /^https:\/\//i.test(raw);

  if (isHttpRemote && (proto !== 'https:' || isHttpsRemote)) {
    candidates.push({ url: raw, source: 'direct', noReferrer: true });
  }

  candidates.push({
    url: buildCoverProxyUrl(endpoint, raw, originOverride),
    source: 'proxy',
    noReferrer: false,
  });

  return candidates;
}
