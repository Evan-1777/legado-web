import { describe, expect, it } from 'vitest';
import { resolveCoverCandidates } from '@/api/media';
import type { EndpointConfig } from '@/api/types';
import { normalizeChapter } from '@/engine/chapterNormalizer';

const ENDPOINT: EndpointConfig = {
  id: 'ep-1',
  name: 'LAN',
  mode: 'direct',
  baseUrl: 'http://192.168.1.24:1122',
};

describe('chapterNormalizer', () => {
  it('strips XSS vectors and rewrites inline image URLs to /image proxy', () => {
    const chapter = normalizeChapter(
      {
        title: '测试章节',
        characterCount: 50,
        paragraphs: [
          {
            html: '正文<script>alert(1)</script><span onclick="evil()">安全文本</span><iframe src="https://evil.test"></iframe>',
            start: 0,
            endExclusive: 10,
          },
          {
            html: '<img src="images/01.jpg" onerror="alert(2)" alt="插图" />',
            start: 10,
            endExclusive: 20,
          },
          {
            html: '<img src="javascript:alert(3)" />正常尾句',
            start: 20,
            endExclusive: 30,
          },
        ],
      },
      {
        bookUrl: 'local:///books/demo.epub',
        endpoint: ENDPOINT,
        chapterTitle: '默认标题',
        targetImgWidth: 1440,
      }
    );

    expect(chapter.isSemantic).toBe(true);
    expect(chapter.title).toBe('测试章节');
    expect(chapter.paragraphs).toHaveLength(3);

    expect(chapter.paragraphs[0].html).not.toContain('<script');
    expect(chapter.paragraphs[0].html).not.toContain('onclick');
    expect(chapter.paragraphs[0].html).not.toContain('<iframe');
    expect(chapter.paragraphs[0].html).toContain('安全文本');

    expect(chapter.paragraphs[1].hasImage).toBe(true);
    expect(chapter.paragraphs[1].html).toContain(
      'http://192.168.1.24:1122/image?url=local%3A%2F%2F%2Fbooks%2Fdemo.epub&amp;path=images%2F01.jpg&amp;width=1440'
    );
    expect(chapter.paragraphs[1].html).toContain('loading="lazy"');
    expect(chapter.paragraphs[1].html).not.toContain('onerror');

    expect(chapter.paragraphs[2].html).not.toContain('javascript:');
    expect(chapter.paragraphs[2].html).toContain('正常尾句');
  });

  it('normalizes plain text fallback into monotonic non-overlapping UTF-16 spans', () => {
    const raw = '第一段内容\r\n\r\n第二段 <tag> & 内容\n第三段';
    const chapter = normalizeChapter(raw, {
      bookUrl: 'book://plain',
      endpoint: ENDPOINT,
      chapterTitle: '纯文本章',
    });

    expect(chapter.isSemantic).toBe(false);
    expect(chapter.title).toBe('纯文本章');
    expect(chapter.paragraphs).toHaveLength(3);
    expect(chapter.paragraphs[1].html).toBe('第二段 &lt;tag&gt; &amp; 内容');

    for (let i = 0; i < chapter.paragraphs.length; i++) {
      const p = chapter.paragraphs[i];
      expect(p.endExclusive).toBeGreaterThan(p.start);
      if (i > 0) {
        expect(p.start).toBeGreaterThanOrEqual(chapter.paragraphs[i - 1].endExclusive);
      }
    }
  });
});

describe('resolveCoverCandidates', () => {
  it('prefers direct HTTPS cover and falls back to /cover proxy', () => {
    const candidates = resolveCoverCandidates(
      {
        coverUrl: 'https://cdn.example.com/old.jpg',
        customCoverUrl: 'https://cdn.example.com/hi-res.jpg',
      },
      ENDPOINT,
      'https:'
    );

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toEqual({
      url: 'https://cdn.example.com/hi-res.jpg',
      source: 'direct',
      noReferrer: true,
    });
    expect(candidates[1].source).toBe('proxy');
    expect(candidates[1].url).toContain('/cover?path=');
  });

  it('skips HTTP direct cover on HTTPS pages to prevent Mixed Content', () => {
    const candidates = resolveCoverCandidates(
      { coverUrl: 'http://insecure.example.com/c.jpg' },
      {
        id: 'ep-p',
        name: 'Proxy',
        mode: 'proxy',
        baseUrl: '/api/legado',
      },
      'https:',
      'https://read.myvps.dev'
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].source).toBe('proxy');
    expect(candidates[0].url).toBe(
      'https://read.myvps.dev/api/legado/cover?path=http%3A%2F%2Finsecure.example.com%2Fc.jpg'
    );
  });

  it('returns empty candidates when book has no cover URL', () => {
    expect(resolveCoverCandidates({}, ENDPOINT, 'https:')).toEqual([]);
  });
});
