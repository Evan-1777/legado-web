import { useEffect, useMemo, useState } from 'react';
import { getTypographicCoverTheme, resolveCoverCandidates } from '@/api/media';
import type { Book, SearchBook } from '@/api/types';
import { useConnectionStore } from '@/stores/connectionStore';

export interface BookCoverProps {
  book: Pick<Book | SearchBook, 'name' | 'author' | 'coverUrl'> & {
    customCoverUrl?: string;
    kind?: string;
  };
  compact?: boolean;
  progressPercent?: number;
  className?: string;
}

export function BookCover({
  book,
  compact = false,
  progressPercent,
  className = '',
}: BookCoverProps) {
  const endpoint = useConnectionStore((s) => s.getActiveEndpoint());

  const candidates = useMemo(
    () => resolveCoverCandidates(book, endpoint),
    [book.coverUrl, book.customCoverUrl, endpoint]
  );

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
  }, [candidates]);

  const current = candidates[candidateIndex];
  const theme = useMemo(
    () => getTypographicCoverTheme(book.name, book.author),
    [book.name, book.author]
  );

  const clampedPct =
    typeof progressPercent === 'number' && Number.isFinite(progressPercent)
      ? Math.max(0, Math.min(100, progressPercent))
      : null;

  return (
    <div
      className={[
        'book-spine-sheen relative overflow-hidden select-none',
        compact ? 'rounded-[4px_6px_6px_4px]' : 'rounded-[6px_10px_10px_6px]',
        className,
      ].join(' ')}
      style={{
        background: theme.bg,
        color: theme.fg,
      }}
    >
      {/* Editorial typographic cover acts both as instant underlayer & permanent fallback */}
      <div
        className={[
          'flex h-full w-full flex-col justify-between',
          compact ? 'p-[6px_5px_5px_7px]' : 'p-[18px_15px_15px_21px]',
        ].join(' ')}
      >
        <div>
          {!compact && (
            <div
              className="mb-3 h-[2px] w-5 rounded-full"
              style={{ background: theme.accent }}
            />
          )}
          <div
            style={{ fontFamily: 'var(--font-serif)' }}
            className={[
              'font-bold tracking-[0.02em] overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical]',
              compact
                ? 'text-[9px] leading-[1.22] [-webkit-line-clamp:3]'
                : 'text-[17px] leading-[1.36] [-webkit-line-clamp:3]',
            ].join(' ')}
          >
            {book.name}
          </div>
          {!compact && book.kind && (
            <div className="mt-1.5 truncate text-[10.5px] tracking-[0.04em] opacity-60">
              {book.kind.split(',')[0]}
            </div>
          )}
        </div>

        {!compact && (
          <div
            className="truncate pt-2 text-[11.5px] tracking-[0.03em] opacity-75"
            style={{ borderTop: `1px solid ${theme.border}` }}
          >
            {book.author || '佚名'}
          </div>
        )}
      </div>

      {/* High-res remote or backend /cover image layered seamlessly on load */}
      {current && (
        <img
          src={current.url}
          alt={book.name}
          loading="lazy"
          decoding="async"
          referrerPolicy={current.noReferrer ? 'no-referrer' : undefined}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setCandidateIndex((i) => i + 1);
          }}
          className={[
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />
      )}

      {clampedPct !== null && clampedPct > 0 && !compact && (
        <div className="absolute inset-x-0 bottom-0 z-[2] h-[3px] bg-black/25">
          <div
            className="h-full rounded-r-full bg-white/92"
            style={{ width: `${clampedPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
