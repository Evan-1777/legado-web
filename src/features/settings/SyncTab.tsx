import { useState } from 'react';
import { AppleSwitch } from '@/components/ui/AppleControls';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconCloud, IconRotateCcw } from '@/components/ui/Icons';
import { toast } from '@/components/ui/Toast';
import { useSettingsStore, type UiTheme } from '@/stores/settingsStore';

const UI_THEMES: { value: UiTheme; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

export function SyncTab() {
  const {
    settings,
    updateSettings,
    resetAllSettings,
    pullCloudConfig,
    pushCloudConfig,
  } = useSettingsStore();

  const [syncing, setSyncing] = useState<'pull' | 'push' | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handlePull = async () => {
    if (syncing) return;
    setSyncing('pull');
    try {
      const found = await pullCloudConfig();
      if (found) {
        toast.success('已从服务端恢复阅读设置');
      } else {
        toast.show('服务端暂无已保存配置');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '拉取配置失败');
    } finally {
      setSyncing(null);
    }
  };

  const handlePush = async () => {
    if (syncing) return;
    setSyncing('push');
    try {
      await pushCloudConfig();
      toast.success('已上传阅读设置至服务端');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传配置失败');
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Interface Appearance */}
      <div
        className="overflow-hidden rounded-[14px] border bg-[var(--l1-bg)]"
        style={{ borderColor: 'var(--l1-border)' }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <span className="text-[14px] font-medium text-[var(--ink-primary)]">
            界面外观
          </span>
          <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-[var(--fill-control)] p-[3px]">
            {UI_THEMES.map((opt) => {
              const active = settings.uiTheme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateSettings({ uiTheme: opt.value })}
                  className={[
                    'h-[28px] rounded-[7px] px-2.5 text-[12px] font-medium transition-all',
                    active
                      ? 'bg-[var(--l1-bg)] text-[var(--ink-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                      : 'text-[var(--ink-secondary)]',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cloud ReadConfig Sync */}
      <div
        className="overflow-hidden rounded-[14px] border bg-[var(--l1-bg)]"
        style={{ borderColor: 'var(--l1-border)' }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <span className="text-[14px] font-medium text-[var(--ink-primary)]">
            自动同步阅读设置
          </span>
          <AppleSwitch
            checked={settings.autoSyncReadConfig}
            onCheckedChange={(autoSyncReadConfig) =>
              updateSettings({ autoSyncReadConfig })
            }
            ariaLabel="自动同步阅读设置"
            surface="ui"
          />
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--divider)' }}
        >
          <button
            type="button"
            disabled={syncing !== null}
            onClick={() => void handlePull()}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--fill-control)] px-3.5 text-[12.5px] font-medium text-[var(--ink-primary)] hover:bg-[var(--fill-control-hover)] disabled:opacity-50"
          >
            <IconCloud size={14} />
            <span>{syncing === 'pull' ? '拉取中…' : '从服务端拉取'}</span>
          </button>
          <button
            type="button"
            disabled={syncing !== null}
            onClick={() => void handlePush()}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 text-[12.5px] font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            <IconCloud size={14} />
            <span>{syncing === 'push' ? '上传中…' : '上传至服务端'}</span>
          </button>
        </div>
      </div>

      {/* Reset Local Preferences */}
      <div
        className="overflow-hidden rounded-[14px] border bg-[var(--l1-bg)]"
        style={{ borderColor: 'var(--l1-border)' }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <span className="text-[14px] font-medium text-[var(--ink-primary)]">
            本地偏好设置
          </span>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--danger-soft)] px-3.5 text-[12.5px] font-medium text-[var(--danger)] hover:opacity-85"
          >
            <IconRotateCcw size={14} />
            <span>重置全部偏好</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="重置本地偏好"
        message="确认将外观、排版、边距及书架视图恢复为默认设置？已导入的本地字体与服务端点将保留。"
        confirmLabel="重置"
        destructive
        onConfirm={() => {
          resetAllSettings();
          setConfirmReset(false);
          toast.show('已恢复全部默认偏好');
        }}
      />
    </div>
  );
}
