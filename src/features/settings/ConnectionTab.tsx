import { useEffect, useState } from 'react';
import { isLikelyMixedContent, resolveWsUrl } from '@/api/endpoint';
import type { EndpointConfig, EndpointMode } from '@/api/types';
import { IconButton } from '@/components/ui/IconButton';
import { IconCheck, IconPlus, IconTrash, IconWifi } from '@/components/ui/Icons';
import { toast } from '@/components/ui/Toast';
import { useBookshelfStore } from '@/stores/bookshelfStore';
import { useConnectionStore } from '@/stores/connectionStore';

export function ConnectionTab() {
  const {
    endpoints,
    activeEndpointId,
    status,
    lastResult,
    selectEndpoint,
    upsertEndpoint,
    removeEndpoint,
    probe,
  } = useConnectionStore();
  const refreshBookshelf = useBookshelfStore((s) => s.refresh);

  const active = endpoints.find((e) => e.id === activeEndpointId) ?? endpoints[0];

  const [editingId, setEditingId] = useState<string | undefined>(active.id);
  const [name, setName] = useState(active.name);
  const [mode, setMode] = useState<EndpointMode>(active.mode);
  const [baseUrl, setBaseUrl] = useState(active.baseUrl);
  const [wsUrl, setWsUrl] = useState(active.wsUrl ?? '');
  const [wsPortOffset, setWsPortOffset] = useState(
    String(active.wsPortOffset ?? 1)
  );

  useEffect(() => {
    const target = endpoints.find((e) => e.id === activeEndpointId) ?? endpoints[0];
    if (!target) return;
    setEditingId(target.id);
    setName(target.name);
    setMode(target.mode);
    setBaseUrl(target.baseUrl);
    setWsUrl(target.wsUrl ?? '');
    setWsPortOffset(String(target.wsPortOffset ?? 1));
  }, [activeEndpointId, endpoints]);

  const draftEndpoint: EndpointConfig = {
    id: editingId || 'draft',
    name: name.trim() || (mode === 'proxy' ? '同源反代' : '局域网直连'),
    mode,
    baseUrl: baseUrl.trim(),
    wsUrl: wsUrl.trim() || undefined,
    wsPortOffset: mode === 'direct' ? Number(wsPortOffset) || 1 : undefined,
  };

  const mixedWarning = isLikelyMixedContent(draftEndpoint);

  let derivedWsPreview = '';
  try {
    if (draftEndpoint.baseUrl) {
      derivedWsPreview = resolveWsUrl(draftEndpoint, '/searchBook');
    }
  } catch {
    derivedWsPreview = '';
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim()) {
      toast.error('请填写服务地址');
      return;
    }
    const saved = upsertEndpoint({
      id: editingId,
      name: draftEndpoint.name,
      mode: draftEndpoint.mode,
      baseUrl: draftEndpoint.baseUrl,
      wsUrl: draftEndpoint.wsUrl,
      wsPortOffset: draftEndpoint.wsPortOffset,
    });
    selectEndpoint(saved.id);
    toast.success('已保存服务连接');
    void refreshBookshelf();
  };

  const handleNew = () => {
    setEditingId(undefined);
    setName('');
    setMode('direct');
    setBaseUrl('http://192.168.1.24:1122');
    setWsUrl('');
    setWsPortOffset('1');
  };

  const handleTest = async () => {
    if (!baseUrl.trim()) {
      toast.error('请填写服务地址');
      return;
    }
    const res = await probe(draftEndpoint);
    if (res.ok) {
      toast.success(`连接正常 · ${res.latencyMs}ms`);
    } else if (res.error) {
      toast.error(res.error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Saved Endpoints */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-[var(--ink-secondary)]">
            已保存端点
          </span>
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--accent)] hover:opacity-80"
          >
            <IconPlus size={14} />
            <span>新增</span>
          </button>
        </div>

        <div
          className="overflow-hidden rounded-[14px] border bg-[var(--l1-bg)]"
          style={{ borderColor: 'var(--l1-border)' }}
        >
          {endpoints.map((ep, idx) => {
            const isSelected = ep.id === activeEndpointId;
            return (
              <div
                key={ep.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  selectEndpoint(ep.id);
                  void refreshBookshelf();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectEndpoint(ep.id);
                    void refreshBookshelf();
                  }
                }}
                style={idx > 0 ? { borderTop: '1px solid var(--divider)' } : undefined}
                className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-[var(--fill-control)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium text-[var(--ink-primary)]">
                      {ep.name}
                    </span>
                    <span className="rounded-full bg-[var(--fill-control)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-secondary)]">
                      {ep.mode === 'proxy' ? '反代' : '直连'}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-[var(--ink-secondary)]">
                    {ep.baseUrl}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {isSelected && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                      <IconCheck size={14} />
                    </span>
                  )}
                  {endpoints.length > 1 && (
                    <IconButton
                      ariaLabel={`删除端点：${ep.name}`}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEndpoint(ep.id);
                      }}
                    >
                      <IconTrash size={14} className="text-[var(--ink-secondary)]" />
                    </IconButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit / Create Endpoint Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <div
          className="grid grid-cols-2 gap-1 rounded-[11px] bg-[var(--fill-control)] p-[3px]"
          role="group"
          aria-label="连接模式"
        >
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={[
              'h-[30px] rounded-[8px] text-[13px] font-medium transition-all',
              mode === 'direct'
                ? 'bg-[var(--l1-bg)] text-[var(--ink-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                : 'text-[var(--ink-secondary)]',
            ].join(' ')}
          >
            局域网直连
          </button>
          <button
            type="button"
            onClick={() => setMode('proxy')}
            className={[
              'h-[30px] rounded-[8px] text-[13px] font-medium transition-all',
              mode === 'proxy'
                ? 'bg-[var(--l1-bg)] text-[var(--ink-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                : 'text-[var(--ink-secondary)]',
            ].join(' ')}
          >
            反代路径
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
              名称
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'proxy' ? 'VPS 反代' : '客厅手机'}
              style={{ borderColor: 'var(--l1-border)' }}
              className="h-[38px] rounded-[10px] border bg-[var(--l1-bg)] px-3 text-[13.5px] focus:border-[var(--accent)] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
              {mode === 'proxy' ? 'HTTP 反代路径' : 'HTTP 服务地址'}
            </span>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={
                mode === 'proxy' ? '/api/legado' : 'http://192.168.1.24:1122'
              }
              style={{ borderColor: 'var(--l1-border)' }}
              className="h-[38px] rounded-[10px] border bg-[var(--l1-bg)] px-3 text-[13.5px] focus:border-[var(--accent)] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
              {mode === 'proxy' ? 'WebSocket 反代路径' : '自定义 WS 地址（可选）'}
            </span>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder={mode === 'proxy' ? '/ws/legado' : '留空默认端口 +1'}
              style={{ borderColor: 'var(--l1-border)' }}
              className="h-[38px] rounded-[10px] border bg-[var(--l1-bg)] px-3 text-[13.5px] focus:border-[var(--accent)] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
          </label>

          {mode === 'direct' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--ink-secondary)]">
                WS 端口偏移
              </span>
              <input
                type="number"
                value={wsPortOffset}
                onChange={(e) => setWsPortOffset(e.target.value)}
                style={{ borderColor: 'var(--l1-border)' }}
                className="h-[38px] rounded-[10px] border bg-[var(--l1-bg)] px-3 text-[13.5px] tabular-nums focus:border-[var(--accent)] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              />
            </label>
          )}
        </div>

        {derivedWsPreview && (
          <div className="truncate text-[11.5px] text-[var(--ink-tertiary)]">
            WS · {derivedWsPreview}
          </div>
        )}

        {mixedWarning && (
          <div className="rounded-[12px] bg-[var(--danger-soft)] px-3.5 py-2.5 text-[12.5px] text-[var(--danger)]">
            当前页面为 HTTPS，直连 HTTP 局域网地址会被浏览器 Mixed Content 拦截。
          </div>
        )}

        {lastResult && (
          <div
            className={[
              'rounded-[12px] px-3.5 py-2.5 text-[12.5px]',
              lastResult.ok
                ? 'bg-[var(--success-soft)] text-[var(--success)]'
                : 'bg-[var(--danger-soft)] text-[var(--danger)]',
            ].join(' ')}
          >
            {lastResult.ok
              ? `连接正常 · ${lastResult.latencyMs} ms · ${lastResult.bookCount ?? 0} 本书`
              : lastResult.error || '连接失败'}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={status === 'checking'}
            onClick={() => void handleTest()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--fill-control)] px-4 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--fill-control-hover)] disabled:opacity-50"
          >
            <IconWifi size={15} />
            <span>{status === 'checking' ? '探测中…' : '测试连接'}</span>
          </button>
          <button
            type="submit"
            className="h-9 rounded-full bg-[var(--accent)] px-4 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            保存并启用
          </button>
        </div>
      </form>
    </div>
  );
}
