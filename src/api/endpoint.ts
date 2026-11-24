import type { EndpointConfig } from './types';

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function getRuntimeOrigin(overrideOrigin?: string): string {
  if (overrideOrigin) return stripTrailingSlash(overrideOrigin);
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    return stripTrailingSlash(window.location.origin);
  }
  return 'http://localhost';
}

export function resolveHttpUrl(
  endpoint: EndpointConfig,
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
  originOverride?: string
): string {
  const cleanPath = ensureLeadingSlash(path);
  let base: string;

  if (endpoint.mode === 'proxy') {
    const rawBase = endpoint.baseUrl.trim();
    if (/^https?:\/\//i.test(rawBase)) {
      base = stripTrailingSlash(rawBase);
    } else {
      const prefix = rawBase ? ensureLeadingSlash(stripTrailingSlash(rawBase)) : '';
      base = `${getRuntimeOrigin(originOverride)}${prefix}`;
    }
  } else {
    const rawBase = endpoint.baseUrl.trim();
    const withProto = /^https?:\/\//i.test(rawBase) ? rawBase : `http://${rawBase}`;
    base = stripTrailingSlash(withProto);
  }

  const fullUrl = new URL(`${base}${cleanPath}`);
  if (query) {
    for (const [key, val] of Object.entries(query)) {
      if (val !== undefined && val !== null) {
        fullUrl.searchParams.set(key, String(val));
      }
    }
  }
  return fullUrl.toString();
}

export function resolveWsUrl(
  endpoint: EndpointConfig,
  path: string,
  originOverride?: string
): string {
  const cleanPath = ensureLeadingSlash(path);
  const origin = getRuntimeOrigin(originOverride);
  const explicitWs = endpoint.wsUrl?.trim();

  if (explicitWs) {
    if (/^wss?:\/\//i.test(explicitWs)) {
      return `${stripTrailingSlash(explicitWs)}${cleanPath}`;
    }
    if (/^https?:\/\//i.test(explicitWs)) {
      const converted = explicitWs.replace(/^http/i, 'ws');
      return `${stripTrailingSlash(converted)}${cleanPath}`;
    }
    const originUrl = new URL(origin);
    const wsProto = originUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const prefix = ensureLeadingSlash(stripTrailingSlash(explicitWs));
    return `${wsProto}//${originUrl.host}${prefix}${cleanPath}`;
  }

  if (endpoint.mode === 'proxy') {
    const originUrl = new URL(origin);
    const wsProto = originUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const rawBase = endpoint.baseUrl.trim();
    if (/^https?:\/\//i.test(rawBase)) {
      const parsed = new URL(rawBase);
      const p = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${p}//${parsed.host}${stripTrailingSlash(parsed.pathname)}${cleanPath}`;
    }
    const prefix = rawBase ? ensureLeadingSlash(stripTrailingSlash(rawBase)) : '';
    return `${wsProto}//${originUrl.host}${prefix}${cleanPath}`;
  }

  // Direct mode: Legado WebSocket server runs on httpPort + wsPortOffset (default +1)
  const rawBase = endpoint.baseUrl.trim();
  const withProto = /^https?:\/\//i.test(rawBase) ? rawBase : `http://${rawBase}`;
  const parsed = new URL(withProto);
  const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  const defaultPort = parsed.protocol === 'https:' ? 443 : 80;
  const httpPort = parsed.port ? Number(parsed.port) : defaultPort;
  const offset = typeof endpoint.wsPortOffset === 'number' ? endpoint.wsPortOffset : 1;
  const wsPort = httpPort + offset;
  const basePath = stripTrailingSlash(parsed.pathname);

  return `${wsProto}//${parsed.hostname}:${wsPort}${basePath}${cleanPath}`;
}

export function isLikelyMixedContent(
  endpoint: EndpointConfig,
  pageProtocol?: string
): boolean {
  const proto =
    pageProtocol ??
    (typeof window !== 'undefined' ? window.location.protocol : 'http:');
  if (proto !== 'https:') return false;
  if (endpoint.mode === 'proxy') {
    return /^http:\/\//i.test(endpoint.baseUrl.trim());
  }
  const raw = endpoint.baseUrl.trim();
  return !/^https:\/\//i.test(raw);
}
