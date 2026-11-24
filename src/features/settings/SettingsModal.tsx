import * as Tabs from '@radix-ui/react-tabs';
import { GlassModal } from '@/components/ui/GlassModal';
import { ConnectionTab } from './ConnectionTab';
import { FontsTab } from './FontsTab';
import { SyncTab } from './SyncTab';

export type SettingsTabId = 'connection' | 'fonts' | 'sync';

export interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
}

export function SettingsModal({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
}: SettingsModalProps) {
  return (
    <GlassModal open={open} onOpenChange={onOpenChange} title="设置" size="md">
      <Tabs.Root
        value={activeTab}
        onValueChange={(val) => onTabChange(val as SettingsTabId)}
        className="flex flex-col gap-4 p-5"
      >
        <Tabs.List className="grid grid-cols-3 gap-1 rounded-[11px] bg-[var(--fill-control)] p-[3px]">
          <Tabs.Trigger
            value="connection"
            className="h-[32px] rounded-[8px] text-[13px] font-medium text-[var(--ink-secondary)] transition-all data-[state=active]:bg-[var(--l1-bg)] data-[state=active]:text-[var(--ink-primary)] data-[state=active]:shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
          >
            连接服务
          </Tabs.Trigger>
          <Tabs.Trigger
            value="fonts"
            className="h-[32px] rounded-[8px] text-[13px] font-medium text-[var(--ink-secondary)] transition-all data-[state=active]:bg-[var(--l1-bg)] data-[state=active]:text-[var(--ink-primary)] data-[state=active]:shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
          >
            字体库
          </Tabs.Trigger>
          <Tabs.Trigger
            value="sync"
            className="h-[32px] rounded-[8px] text-[13px] font-medium text-[var(--ink-secondary)] transition-all data-[state=active]:bg-[var(--l1-bg)] data-[state=active]:text-[var(--ink-primary)] data-[state=active]:shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
          >
            偏好与同步
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="connection" className="outline-none">
          <ConnectionTab />
        </Tabs.Content>
        <Tabs.Content value="fonts" className="outline-none">
          <FontsTab />
        </Tabs.Content>
        <Tabs.Content value="sync" className="outline-none">
          <SyncTab />
        </Tabs.Content>
      </Tabs.Root>
    </GlassModal>
  );
}
