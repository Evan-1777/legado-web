import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  getBookContent,
  getBookshelf,
  getReadConfig,
  saveBookProgress,
  unwrapReturnData,
} from '@/api/client';
import {
  isLikelyMixedContent,
  resolveHttpUrl,
  resolveWsUrl,
} from '@/api/endpoint';
import type { EndpointConfig } from '@/api/types';

const DIRECT_EP: EndpointConfig = {
  id: 'ep-direct',
  name: 'LAN',
  mode: 'direct',
  baseUrl: 'http://192.168.1.24:1122',
  wsPortOffset: 1,
};

const PROXY_EP: EndpointConfig = {
  id: 'ep-proxy',
  name: 'VPS Proxy',
  mode: 'proxy',
  baseUrl: '/api/legado',
  wsUrl: '/ws/legado',
};

function mockFetchJson(payload: unknown, status = 200) {
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('endpoint URL resolution', () => {
  it('resolves direct HTTP and default port+1 WS URLs', () => {
    expect(
      resolveHttpUrl(DIRECT_EP, '/getBookContent', {
        url: 'https://book.test/1',
        index: 3,
        format: 'semantic',
      })
    ).toBe(
      'http://192.168.1.24:1122/getBookContent?url=https%3A%2F%2Fbook.test%2F1&index=3&format=semantic'
    );

    expect(resolveWsUrl(DIRECT_EP, '/searchBook')).toBe(
      'ws://192.168.1.24:1123/searchBook'
    );
  });

  it('supports custom WS port offset and explicit WS URL in direct mode', () => {
    const customOffset: EndpointConfig = { ...DIRECT_EP, wsPortOffset: 10 };
    expect(resolveWsUrl(customOffset, '/searchBook')).toBe(
      'ws://192.168.1.24:1132/searchBook'
    );

    const explicitWs: EndpointConfig = {
      ...DIRECT_EP,
      wsUrl: 'ws://192.168.1.24:9001',
    };
    expect(resolveWsUrl(explicitWs, '/searchBook')).toBe(
      'ws://192.168.1.24:9001/searchBook'
    );
  });

  it('resolves same-origin HTTPS proxy paths to HTTPS and WSS', () => {
    expect(
      resolveHttpUrl(PROXY_EP, '/getBookshelf', undefined, 'https://read.myvps.dev')
    ).toBe('https://read.myvps.dev/api/legado/getBookshelf');

    expect(
      resolveWsUrl(PROXY_EP, '/searchBook', 'https://read.myvps.dev')
    ).toBe('wss://read.myvps.dev/ws/legado/searchBook');
  });

  it('detects HTTPS -> HTTP Mixed Content risk', () => {
    expect(isLikelyMixedContent(DIRECT_EP, 'https:')).toBe(true);
    expect(isLikelyMixedContent(DIRECT_EP, 'http:')).toBe(false);
    expect(isLikelyMixedContent(PROXY_EP, 'https:')).toBe(false);
  });
});

describe('Legado API client contract', () => {
  it('unwraps ReturnData and throws ApiError on failure', () => {
    expect(unwrapReturnData({ isSuccess: true, data: [1, 2] })).toEqual([1, 2]);
    expect(() =>
      unwrapReturnData({ isSuccess: false, errorMsg: '参数错误' })
    ).toThrow(ApiError);
  });

  it('normalizes empty bookshelf error into []', async () => {
    mockFetchJson({ isSuccess: false, errorMsg: '还没有添加小说', data: null });
    const list = await getBookshelf(DIRECT_EP);
    expect(list).toEqual([]);
  });

  it('handles semantic ReaderWebChapter and legacy plain string content', async () => {
    const semanticPayload = {
      title: '第一章',
      characterCount: 12,
      paragraphs: [{ html: '你好世界', start: 0, endExclusive: 4 }],
    };
    const fetchMock = mockFetchJson({ isSuccess: true, data: semanticPayload });
    const semanticRes = await getBookContent(DIRECT_EP, 'book://1', 0);
    expect(semanticRes).toEqual(semanticPayload);
    expect(String(fetchMock.mock.calls[0][0])).toContain('format=semantic');

    mockFetchJson({ isSuccess: true, data: '第一段\n第二段' });
    const plainRes = await getBookContent(DIRECT_EP, 'book://1', 1);
    expect(plainRes).toBe('第一段\n第二段');
  });

  it('sends exact BookProgress fields and supports keepalive mode', async () => {
    const fetchMock = mockFetchJson({ isSuccess: true, data: null });
    const payload = {
      url: 'https://book.test/1',
      name: '三体',
      author: '刘慈欣',
      durChapterIndex: 11,
      durChapterPos: 420,
      durChapterTime: 1700000000000,
      durChapterTitle: '第十二章',
    };

    await saveBookProgress(DIRECT_EP, payload, false);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual(payload);

    await saveBookProgress(DIRECT_EP, payload, true);
    const [, keepaliveInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(keepaliveInit.keepalive).toBe(true);
  });

  it('parses getReadConfig JSON string and handles unset config', async () => {
    mockFetchJson({ isSuccess: false, errorMsg: '没有配置', data: null });
    expect(await getReadConfig(DIRECT_EP)).toBeNull();

    mockFetchJson({
      isSuccess: true,
      data: JSON.stringify({ theme: 'dark', fontSize: 21 }),
    });
    expect(await getReadConfig(DIRECT_EP)).toEqual({ theme: 'dark', fontSize: 21 });
  });
});
