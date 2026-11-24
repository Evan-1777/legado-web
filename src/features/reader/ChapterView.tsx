import { memo } from 'react';
import type { NormalizedChapter } from '@/api/types';

export interface ChapterViewProps {
  chapter: NormalizedChapter;
  onImageClick?: (src: string, alt: string) => void;
}

export const ChapterView = memo(function ChapterView({
  chapter,
  onImageClick,
}: ChapterViewProps) {
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (target && target.tagName === 'IMG' && onImageClick) {
      e.stopPropagation();
      const img = target as HTMLImageElement;
      onImageClick(img.src, img.alt || '');
    }
  };

  return (
    <div onClick={handleClick}>
      <h1 className="chapter-heading">{chapter.title}</h1>
      <div className="chapter-body">
        {chapter.paragraphs.length > 0 ? (
          chapter.paragraphs.map((p, idx) => (
            <p
              key={`${idx}-${p.start}`}
              data-start={p.start}
              data-end={p.endExclusive}
              className={p.hasImage ? 'has-img' : undefined}
              dangerouslySetInnerHTML={{ __html: p.html }}
            />
          ))
        ) : (
          <p className="text-[var(--r-ink-muted)]" style={{ textIndent: 0 }}>
            本章暂无正文内容
          </p>
        )}
      </div>
    </div>
  );
});
