import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { IconCheck, IconPlus, IconTrash } from '@/components/ui/Icons';
import { toast } from '@/components/ui/Toast';
import type { StoredFontMeta } from '@/storage/fontDb';
import { BUILTIN_FONTS } from '@/storage/fontManager';
import { useFontStore } from '@/stores/fontStore';
import { useSettingsStore } from '@/stores/settingsStore';

const PREVIEW_SAMPLE = '天地玄黄，宇宙洪荒。0123';

function formatMb(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FontsTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    fonts,
    totalBytes,
    importing,
    error,
    refreshList,
    ensureLoaded,
    importFile,
    deleteFont,
  } = useFontStore();
  const { settings, updateSettings } = useSettingsStore();

  const [deleteTarget, setDeleteTarget] = useState<StoredFontMeta | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  // Lazily register custom fonts for visual preview inside the font manager
  useEffect(() => {
    for (const f of fonts) {
      void ensureLoaded(f.id);
    }
  }, [fonts, ensureLoaded]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const meta = await importFile(file);
      updateSettings({ fontId: meta.id });
      toast.success(`已导入字体「${meta.name}」`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入字体失败');
    }
  };

  const handleSelectFont = async (fontId: string) => {
    const ok = await ensureLoaded(fontId);
    if (!ok) {
      toast.error('字体加载失败');
      return;
    }
    updateSettings({ fontId });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteFont(deleteTarget.id);
      toast.show(`已删除「${deleteTarget.name}」`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除字体失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12.5px] text-[var(--ink-secondary)] tabular-nums">
          本地持久化存储 · {formatMb(totalBytes)}
        </div>
        <button
          type="button"
          disabled={importing}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 text-[12.5px] font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          <IconPlus size={14} />
          <span>{importing ? '导入中…' : '导入字体'}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
      </div>

      {error && (
        <div className="rounded-[12px] bg-[var(--danger-soft)] px-3.5 py-2.5 text-[12.5px] text-[var(--danger)]">
          {error}
        </div>
      )}

      {/* System Built-in Fonts */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
          系统字体
        </span>
        <div
          className="overflow-hidden rounded-[14px] border bg-[var(--l1-bg)]"
          style={{ borderColor: 'var(--l1-border)' }}
        >
          {BUILTIN_FONTS.map((f, idx) => {
            const active = settings.fontId === f.id;
            return (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                onClick={() => void handleSelectFont(f.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleSelectFont(f.id);
                  }
                }}
                style={idx > 0 ? { borderTop: '1px solid var(--divider)' } : undefined}
                className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-[var(--fill-control)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-[var(--ink-primary)]">
                    {f.name}
                  </div>
                  <div
                    style={{ fontFamily: f.cssFamily }}
                    className="mt-0.5 truncate text-[13px] text-[var(--ink-secondary)]"
                  >
                    {PREVIEW_SAMPLE}
                  </div>
                </div>
                {active && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    <IconCheck size={14} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Persisted Custom Fonts (IndexedDB) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
          已导入字体 ({fonts.length})
        </span>
        {fonts.length === 0 ? (
          <div
            className="rounded-[14px] border bg-[var(--l1-bg)] px-4 py-6 text-center text-[13px] text-[var(--ink-tertiary)]"
            style={{ borderColor: 'var(--l1-border)' }}
          >
            支持 TTF · OTF · WOFF · WOFF2
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-[14px] border bg-[var(--l1-bg)]"
            style={{ borderColor: 'var(--l1-border)' }}
          >
            {fonts.map((f, idx) => {
              const active = settings.fontId === f.id;
              return (
                <div
                  key={f.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleSelectFont(f.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void handleSelectFont(f.id);
                    }
                  }}
                  style={
                    idx > 0 ? { borderTop: '1px solid var(--divider)' } : undefined
                  }
                  className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-[var(--fill-control)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-[var(--ink-primary)]">
                        {f.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-[var(--fill-control)] px-2 py-0.5 text-[10.5px] uppercase text-[var(--ink-secondary)]">
                        {f.format} · {formatMb(f.size)}
                      </span>
                    </div>
                    <div
                      style={{ fontFamily: `"${f.family}", var(--font-serif)` }}
                      className="mt-0.5 truncate text-[13.5px] text-[var(--ink-secondary)]"
                    >
                      {PREVIEW_SAMPLE}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {active && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                        <IconCheck size={14} />
                      </span>
                    )}
                    <IconButton
                      ariaLabel={`删除字体：${f.name}`}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(f);
                      }}
                    >
                      <IconTrash
                        size={15}
                        className="text-[var(--ink-secondary)] hover:text-[var(--danger)]"
                      />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="删除字体"
        message={
          deleteTarget
            ? `确认从本地字体库删除「${deleteTarget.name}」？`
            : ''
        }
        confirmLabel="删除"
        destructive
        busy={deleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
