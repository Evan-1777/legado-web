import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { IconButton } from '@/components/ui/IconButton';
import {
  IconArrowUpDown,
  IconCheck,
  IconGrid,
  IconList,
  IconMoon,
  IconRefresh,
  IconSearch,
  IconSearchPlus,
  IconSettings,
  IconSun,
  IconUpload,
} from '@/components/ui/Icons';
import { useConnectionStore } from '@/stores/connectionStore';
import {
  useSettingsStore,
  type BookshelfSort,
  type BookshelfView,
} from '@/stores/settingsStore';

export interface BookshelfHeaderProps {
  totalCount: number;
  filterQuery: string;
  onFilterChange: (q: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenSearch: () => void;
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  resolvedDark: boolean;
  onToggleUiDark: () => void;
}

const SORT_OPTIONS: { value: BookshelfSort; label: string }[] = [
  { value: 'recent', label: '最近阅读' },
  { value: 'name', label: '书名' },
  { value: 'latest', label: '最新章节' },
];

export function BookshelfHeader({
  totalCount,
  filterQuery,
  onFilterChange,
  refreshing,
  onRefresh,
  onOpenSearch,
  onOpenUpload,
  onOpenSettings,
  resolvedDark,
  onToggleUiDark,
}: BookshelfHeaderProps) {
  const { settings, updateSettings } = useSettingsStore();
  const connStatus = useConnectionStore((s) => s.status);

  const setView = (bookshelfView: BookshelfView) =>
    updateSettings({ bookshelfView });
  const setSort = (bookshelfSort: BookshelfSort) =>
    updateSettings({ bookshelfSort });

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === settings.bookshelfSort)?.label ?? '最近阅读';

  return (
    <header className="glass-l2 sticky top-0 z-30 border-b pt-safe">
      <div className="mx-auto flex h-[60px] max-w-[1280px] items-center gap-2.5 px-4 sm:gap-3.5 sm:px-6">
        <div className="flex shrink-0 items-baseline gap-1.5">
          <h1
            style={{ fontFamily: 'var(--font-display)' }}
            className="m-0 text-[20px] font-bold tracking-[-0.025em] text-[var(--ink-primary)] sm:text-[22px]"
          >
            书架
          </h1>
          <span className="text-[13px] font-medium tabular-nums text-[var(--ink-tertiary)]">
            {totalCount}
          </span>
        </div>

        {/* Inline Filter Input */}
        <div className="relative ml-auto flex max-w-[340px] flex-1 items-center">
          <IconSearch
            size={15}
            className="pointer-events-none absolute left-3 text-[var(--ink-tertiary)]"
          />
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="筛选"
            aria-label="筛选书名或作者"
            className={[
              'h-[34px] w-full rounded-full border border-transparent bg-[var(--fill-control)]',
              'pl-[33px] pr-3 text-[13.5px] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)]',
              'transition-[background-color,border-color,box-shadow] duration-150',
              'focus:border-[var(--l1-border)] focus:bg-[var(--l1-bg)] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)]',
            ].join(' ')}
          />
        </div>

        {/* Action Cluster */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Sort Dropdown (works uniformly on desktop & mobile) */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="书架排序"
                title={`排序：${currentSortLabel}`}
                className={[
                  'inline-flex h-[34px] items-center gap-1.5 rounded-full bg-[var(--fill-control)]',
                  'px-2.5 text-[13px] font-medium text-[var(--ink-primary)] transition-colors hover:bg-[var(--fill-control-hover)]',
                  'sm:px-3',
                ].join(' ')}
              >
                <IconArrowUpDown size={14} className="text-[var(--ink-secondary)]" />
                <span className="hidden md:inline">{currentSortLabel}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                style={{
                  background: 'var(--l3-bg)',
                  borderColor: 'var(--l2-border)',
                  boxShadow: 'var(--l3-shadow)',
                }}
                className="z-80 min-w-[144px] rounded-[14px] border p-1.5 backdrop-blur-[28px] backdrop-saturate-[180%] anim-popover-in"
              >
                {SORT_OPTIONS.map((opt) => {
                  const active = settings.bookshelfSort === opt.value;
                  return (
                    <DropdownMenu.Item
                      key={opt.value}
                      onSelect={() => setSort(opt.value)}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-[9px] px-2.5 py-2 text-[13px] text-[var(--ink-primary)] outline-none transition-colors data-[highlighted]:bg-[var(--fill-control)]"
                    >
                      <span className={active ? 'font-semibold text-[var(--accent)]' : ''}>
                        {opt.label}
                      </span>
                      {active && <IconCheck size={14} className="text-[var(--accent)]" />}
                    </DropdownMenu.Item>
                  );
                })}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Grid / List Segmented Toggle */}
          <div
            role="group"
            aria-label="视图切换"
            className="mx-0.5 inline-flex rounded-full bg-[var(--fill-control)] p-[2px]"
          >
            <button
              type="button"
              aria-label="网格视图"
              title="网格视图"
              aria-pressed={settings.bookshelfView === 'grid'}
              onClick={() => setView('grid')}
              className={[
                'inline-flex h-[30px] w-[30px] items-center justify-center rounded-full transition-all duration-150',
                settings.bookshelfView === 'grid'
                  ? 'bg-[var(--l1-bg)] text-[var(--ink-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
              ].join(' ')}
            >
              <IconGrid size={15} />
            </button>
            <button
              type="button"
              aria-label="列表视图"
              title="列表视图"
              aria-pressed={settings.bookshelfView === 'list'}
              onClick={() => setView('list')}
              className={[
                'inline-flex h-[30px] w-[30px] items-center justify-center rounded-full transition-all duration-150',
                settings.bookshelfView === 'list'
                  ? 'bg-[var(--l1-bg)] text-[var(--ink-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
              ].join(' ')}
            >
              <IconList size={15} />
            </button>
          </div>

          <IconButton ariaLabel="在线搜书" onClick={onOpenSearch}>
            <IconSearchPlus size={18} />
          </IconButton>

          <IconButton ariaLabel="上传本地书籍" onClick={onOpenUpload}>
            <IconUpload size={18} />
          </IconButton>

          <IconButton
            ariaLabel="刷新书架"
            onClick={onRefresh}
            disabled={refreshing}
            className="hidden sm:inline-flex"
          >
            <IconRefresh
              size={17}
              className={refreshing ? 'animate-spin' : undefined}
            />
          </IconButton>

          <IconButton
            ariaLabel={resolvedDark ? '切换亮色外观' : '切换暗色外观'}
            onClick={onToggleUiDark}
            className="hidden sm:inline-flex"
          >
            {resolvedDark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </IconButton>

          <IconButton ariaLabel="设置" onClick={onOpenSettings}>
            <IconSettings size={18} />
            <span
              aria-hidden="true"
              className={[
                'absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full ring-[1.5px] ring-[var(--l2-glass-solid)]',
                connStatus === 'error'
                  ? 'bg-[var(--danger)]'
                  : connStatus === 'connected'
                    ? 'bg-[var(--success)]'
                    : 'bg-[var(--ink-tertiary)]',
              ].join(' ')}
            />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
