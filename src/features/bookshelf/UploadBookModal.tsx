import { useRef, useState } from 'react';
import { addLocalBook } from '@/api/client';
import { GlassModal } from '@/components/ui/GlassModal';
import { IconUpload } from '@/components/ui/Icons';
import { toast } from '@/components/ui/Toast';
import { useBookshelfStore } from '@/stores/bookshelfStore';
import { useConnectionStore } from '@/stores/connectionStore';

export interface UploadBookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCEPTED_EXT = '.txt,.epub,.umd,.cbz,.pdf';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function UploadBookModal({ open, onOpenChange }: UploadBookModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const getActiveEndpoint = useConnectionStore((s) => s.getActiveEndpoint);
  const refreshBookshelf = useBookshelfStore((s) => s.refresh);

  const handleClose = (next: boolean) => {
    if (uploading) return;
    if (!next) {
      setSelectedFile(null);
      setError(null);
      setProgress(0);
    }
    onOpenChange(next);
  };

  const acceptFile = (file: File | undefined | null) => {
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    setProgress(0);
  };

  const handleSubmit = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      await addLocalBook(getActiveEndpoint(), selectedFile, (pct) =>
        setProgress(pct)
      );
      toast.success(`已上传「${selectedFile.name}」`);
      setSelectedFile(null);
      setProgress(0);
      onOpenChange(false);
      void refreshBookshelf();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <GlassModal
      open={open}
      onOpenChange={handleClose}
      title="上传本地书籍"
      size="compact"
    >
      <div className="flex flex-col gap-4 p-5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[16px] border-[1.5px] border-dashed px-5 py-9 text-center transition-colors',
            dragging
              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
              : 'border-[var(--divider)] bg-[var(--l1-bg)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/50',
          ].join(' ')}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--fill-control)] text-[var(--ink-primary)]">
            <IconUpload size={22} />
          </div>
          {selectedFile ? (
            <div className="max-w-full">
              <div className="truncate text-[14px] font-semibold text-[var(--ink-primary)]">
                {selectedFile.name}
              </div>
              <div className="mt-0.5 text-[12px] tabular-nums text-[var(--ink-secondary)]">
                {formatBytes(selectedFile.size)}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[14px] font-medium text-[var(--ink-primary)]">
                选择或拖放书籍文件
              </div>
              <div className="mt-1 text-[12px] text-[var(--ink-tertiary)]">
                TXT · EPUB · UMD · CBZ · PDF
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXT}
            className="hidden"
            onChange={(e) => {
              acceptFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        {uploading && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12px] tabular-nums text-[var(--ink-secondary)]">
              <span>上传中</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fill-control)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-[12px] bg-[var(--danger-soft)] px-3.5 py-2.5 text-[13px] text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            disabled={uploading}
            onClick={() => handleClose(false)}
            className="h-9 rounded-full bg-[var(--fill-control)] px-4 text-[13.5px] font-medium text-[var(--ink-primary)] transition-colors hover:bg-[var(--fill-control-hover)] disabled:opacity-45"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!selectedFile || uploading}
            onClick={() => void handleSubmit()}
            className="h-9 rounded-full bg-[var(--accent)] px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-45"
          >
            {uploading ? '上传中…' : '上传'}
          </button>
        </div>
      </div>
    </GlassModal>
  );
}
