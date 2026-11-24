import { useEffect, useState, type ReactNode } from 'react';
import { AppleSlider, AppleSwitch } from '@/components/ui/AppleControls';
import { GlassModal } from '@/components/ui/GlassModal';
import { GlassPopover } from '@/components/ui/GlassPopover';
import {
  IconAlignJustify,
  IconAlignLeft,
  IconFont,
  IconPageMode,
  IconRotateCcw,
  IconScrollMode,
} from '@/components/ui/Icons';
import { toast } from '@/components/ui/Toast';
import { BUILTIN_FONTS } from '@/storage/fontManager';
import { useFontStore } from '@/stores/fontStore';
import {
  useSettingsStore,
  type FontWeightValue,
  type ReaderTheme,
} from '@/stores/settingsStore';

export interface TypographyPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  onOpenFontLibrary: () => void;
}

const THEME_SWATCHES: {
  id: ReaderTheme;
  label: string;
  bg: string;
  fg: string;
}[] = [
  { id: 'white', label: '白', bg: '#ffffff', fg: '#1d1d1f' },
  { id: 'sepia', label: '纸', bg: '#f7f1e3', fg: '#382c20' },
  { id: 'gray', label: '灰', bg: '#edeff2', fg: '#22252a' },
  { id: 'dark', label: '深', bg: '#1c1c1e', fg: '#d8d8dc' },
  { id: 'oled', label: '黑', bg: '#000000', fg: '#b8b8be' },
  {
    id: 'auto',
    label: '自动',
    bg: 'linear-gradient(135deg, #ffffff 50%, #1c1c1e 50%)',
    fg: '#0071e3',
  },
];

const WEIGHTS: { value: FontWeightValue; label: string }[] = [
  { value: 300, label: '细' },
  { value: 400, label: '常规' },
  { value: 500, label: '中' },
  { value: 600, label: '粗' },
];

function useIsCompactViewport(): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setCompact(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return compact;
}

export function TypographyPopover({
  open,
  onOpenChange,
  trigger,
  onOpenFontLibrary,
}: TypographyPopoverProps) {
  const [tab, setTab] = useState<'appearance' | 'layout'>('appearance');
  const isCompact = useIsCompactViewport();

  const { settings, updateSettings, resetReaderSettings } = useSettingsStore();
  const { fonts: customFonts, ensureLoaded } = useFontStore();

  const handleSelectFont = async (fontId: string) => {
    await ensureLoaded(fontId);
    updateSettings({ fontId });
  };

  const panelBody = (
    <div className="flex flex-col gap-3.5 p-4 text-[13px]" style={{ color: 'var(--r-ink)' }}>
      {/* Segmented Tabs: 外观 / 版式 */}
      <div
        role="tablist"
        className="grid grid-cols-2 gap-1 rounded-[11px] p-[3px]"
        style={{ background: 'var(--r-control)' }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'appearance'}
          onClick={() => setTab('appearance')}
          style={
            tab === 'appearance'
              ? { background: 'var(--r-bg)', color: 'var(--r-ink)' }
              : { color: 'var(--r-ink-muted)' }
          }
          className={[
            'h-[30px] rounded-[8px] text-[13px] font-medium transition-all duration-150',
            tab === 'appearance' ? 'shadow-[0_1px_4px_rgba(0,0,0,0.14)]' : '',
          ].join(' ')}
        >
          外观
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'layout'}
          onClick={() => setTab('layout')}
          style={
            tab === 'layout'
              ? { background: 'var(--r-bg)', color: 'var(--r-ink)' }
              : { color: 'var(--r-ink-muted)' }
          }
          className={[
            'h-[30px] rounded-[8px] text-[13px] font-medium transition-all duration-150',
            tab === 'layout' ? 'shadow-[0_1px_4px_rgba(0,0,0,0.14)]' : '',
          ].join(' ')}
        >
          版式与边距
        </button>
      </div>

      {tab === 'appearance' ? (
        <div className="flex flex-col gap-3.5">
          {/* Reading Mode */}
          <div>
            <div
              className="grid grid-cols-2 gap-1 rounded-[11px] p-[3px]"
              style={{ background: 'var(--r-control)' }}
            >
              <button
                type="button"
                onClick={() => updateSettings({ readingMode: 'scroll' })}
                style={
                  settings.readingMode === 'scroll'
                    ? { background: 'var(--r-bg)', color: 'var(--r-ink)' }
                    : { color: 'var(--r-ink-muted)' }
                }
                className={[
                  'inline-flex h-[32px] items-center justify-center gap-1.5 rounded-[8px] text-[13px] font-medium transition-all',
                  settings.readingMode === 'scroll'
                    ? 'shadow-[0_1px_4px_rgba(0,0,0,0.14)]'
                    : '',
                ].join(' ')}
              >
                <IconScrollMode size={15} />
                <span>滚动</span>
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ readingMode: 'paginated' })}
                style={
                  settings.readingMode === 'paginated'
                    ? { background: 'var(--r-bg)', color: 'var(--r-ink)' }
                    : { color: 'var(--r-ink-muted)' }
                }
                className={[
                  'inline-flex h-[32px] items-center justify-center gap-1.5 rounded-[8px] text-[13px] font-medium transition-all',
                  settings.readingMode === 'paginated'
                    ? 'shadow-[0_1px_4px_rgba(0,0,0,0.14)]'
                    : '',
                ].join(' ')}
              >
                <IconPageMode size={15} />
                <span>分页</span>
              </button>
            </div>

            {settings.readingMode === 'paginated' && (
              <div className="mt-2.5 flex items-center justify-between">
                <span>宽屏双栏</span>
                <AppleSwitch
                  checked={settings.twoColumnOnWide}
                  onCheckedChange={(v) => updateSettings({ twoColumnOnWide: v })}
                  ariaLabel="宽屏双栏"
                />
              </div>
            )}
          </div>

          {/* 5 + 1 Theme Swatches */}
          <div className="pt-3" style={{ borderTop: '1px solid var(--r-divider)' }}>
            <div className="grid grid-cols-6 gap-2">
              {THEME_SWATCHES.map((sw) => {
                const active = settings.theme === sw.id;
                return (
                  <button
                    key={sw.id}
                    type="button"
                    aria-label={`阅读主题：${sw.label}`}
                    aria-pressed={active}
                    onClick={() => updateSettings({ theme: sw.id })}
                    style={{
                      background: sw.bg,
                      color: sw.fg,
                      borderColor: active
                        ? 'var(--accent)'
                        : 'rgba(128,128,128,0.26)',
                      boxShadow: active
                        ? '0 0 0 2px var(--accent-soft)'
                        : undefined,
                    }}
                    className="flex h-[36px] items-center justify-center rounded-[10px] border-[1.5px] text-[11.5px] font-semibold transition-transform hover:-translate-y-[1px]"
                  >
                    {sw.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Family Picker */}
          <div className="pt-3" style={{ borderTop: '1px solid var(--r-divider)' }}>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[12px] font-medium"
                style={{ color: 'var(--r-ink-muted)' }}
              >
                字体
              </span>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onOpenFontLibrary();
                }}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)] hover:opacity-80"
              >
                <IconFont size={13} />
                <span>字体库</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BUILTIN_FONTS.map((f) => {
                const active = settings.fontId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => void handleSelectFont(f.id)}
                    style={{
                      fontFamily: f.cssFamily,
                      background: active
                        ? 'var(--accent-soft)'
                        : 'var(--r-control)',
                      borderColor: active ? 'var(--accent)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--r-ink)',
                    }}
                    className="rounded-[9px] border px-2.5 py-1.5 text-[13px] font-medium transition-colors"
                  >
                    {f.name}
                  </button>
                );
              })}
              {customFonts.map((f) => {
                const active = settings.fontId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => void handleSelectFont(f.id)}
                    style={{
                      fontFamily: `"${f.family}", var(--font-serif)`,
                      background: active
                        ? 'var(--accent-soft)'
                        : 'var(--r-control)',
                      borderColor: active ? 'var(--accent)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--r-ink)',
                    }}
                    className="max-w-[140px] truncate rounded-[9px] border px-2.5 py-1.5 text-[13px] font-medium transition-colors"
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size Stepper + Weight */}
          <div
            className="flex flex-col gap-3 pt-3"
            style={{ borderTop: '1px solid var(--r-divider)' }}
          >
            <div className="flex items-center justify-between text-[12px]">
              <span style={{ color: 'var(--r-ink-muted)' }}>字号</span>
              <span className="font-semibold tabular-nums">
                {settings.fontSize}px
              </span>
            </div>
            <div
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-[11px] p-[3px]"
              style={{ background: 'var(--r-control)' }}
            >
              <button
                type="button"
                aria-label="减小字号"
                disabled={settings.fontSize <= 12}
                onClick={() =>
                  updateSettings((s) => ({ fontSize: s.fontSize - 1 }))
                }
                className="flex h-[34px] items-center justify-center rounded-[8px] text-[13px] font-semibold transition-colors hover:bg-[var(--r-control-hover)] disabled:opacity-35"
              >
                A-
              </button>
              <span className="px-3 text-[13px] font-semibold tabular-nums">
                {settings.fontSize}
              </span>
              <button
                type="button"
                aria-label="增大字号"
                disabled={settings.fontSize >= 32}
                onClick={() =>
                  updateSettings((s) => ({ fontSize: s.fontSize + 1 }))
                }
                className="flex h-[34px] items-center justify-center rounded-[8px] text-[16px] font-semibold transition-colors hover:bg-[var(--r-control-hover)] disabled:opacity-35"
              >
                A+
              </button>
            </div>

            <div>
              <div
                className="mb-1.5 text-[12px]"
                style={{ color: 'var(--r-ink-muted)' }}
              >
                字重
              </div>
              <div
                className="grid grid-cols-4 gap-1 rounded-[10px] p-[3px]"
                style={{ background: 'var(--r-control)' }}
              >
                {WEIGHTS.map((w) => {
                  const active = settings.fontWeight === w.value;
                  return (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => updateSettings({ fontWeight: w.value })}
                      style={
                        active
                          ? { background: 'var(--r-bg)', color: 'var(--r-ink)' }
                          : { color: 'var(--r-ink-muted)' }
                      }
                      className={[
                        'h-[28px] rounded-[7px] text-[12px] font-medium transition-all',
                        active ? 'shadow-[0_1px_3px_rgba(0,0,0,0.14)]' : '',
                      ].join(' ')}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Typography Sliders */}
          <SliderRow
            label="行高"
            valueText={settings.lineHeight.toFixed(2)}
            value={settings.lineHeight}
            min={1.3}
            max={2.4}
            step={0.04}
            onChange={(lineHeight) => updateSettings({ lineHeight })}
          />
          <SliderRow
            label="字间距"
            valueText={`${settings.letterSpacing.toFixed(3)}em`}
            value={settings.letterSpacing}
            min={0}
            max={0.16}
            step={0.005}
            onChange={(letterSpacing) => updateSettings({ letterSpacing })}
          />
          <SliderRow
            label="段间距"
            valueText={`${settings.paragraphSpacing}px`}
            value={settings.paragraphSpacing}
            min={0}
            max={36}
            step={2}
            onChange={(paragraphSpacing) => updateSettings({ paragraphSpacing })}
          />

          {/* Margin & Measure Sliders */}
          <div
            className="flex flex-col gap-3 pt-3"
            style={{ borderTop: '1px solid var(--r-divider)' }}
          >
            <SliderRow
              label="左右边距"
              valueText={`${settings.paddingX}px`}
              value={settings.paddingX}
              min={12}
              max={96}
              step={4}
              onChange={(paddingX) => updateSettings({ paddingX })}
            />
            <SliderRow
              label="上下边距"
              valueText={`${settings.paddingY}px`}
              value={settings.paddingY}
              min={8}
              max={72}
              step={2}
              onChange={(paddingY) => updateSettings({ paddingY })}
            />
            <SliderRow
              label="版心宽度"
              valueText={`${settings.maxWidth}px`}
              value={settings.maxWidth}
              min={480}
              max={1080}
              step={20}
              onChange={(maxWidth) => updateSettings({ maxWidth })}
            />
            <SliderRow
              label="双栏栏距"
              valueText={`${settings.columnGap}px`}
              value={settings.columnGap}
              min={24}
              max={80}
              step={4}
              onChange={(columnGap) => updateSettings({ columnGap })}
            />
          </div>

          {/* Alignment, Animation & Behavior Toggles */}
          <div
            className="flex flex-col gap-2.5 pt-3"
            style={{ borderTop: '1px solid var(--r-divider)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <span>对齐方式</span>
              <div
                className="grid w-[124px] grid-cols-2 gap-1 rounded-[9px] p-[2px]"
                style={{ background: 'var(--r-control)' }}
              >
                <button
                  type="button"
                  aria-label="两端对齐"
                  onClick={() => updateSettings({ textAlign: 'justify' })}
                  style={
                    settings.textAlign === 'justify'
                      ? { background: 'var(--r-bg)', color: 'var(--r-ink)' }
                      : { color: 'var(--r-ink-muted)' }
                  }
                  className="inline-flex h-[26px] items-center justify-center rounded-[7px]"
                >
                  <IconAlignJustify size={14} />
                </button>
                <button
                  type="button"
                  aria-label="左对齐"
                  onClick={() => updateSettings({ textAlign: 'left' })}
                  style={
                    settings.textAlign === 'left'
                      ? { background: 'var(--r-bg)', color: 'var(--r-ink)' }
                      : { color: 'var(--r-ink-muted)' }
                  }
                  className="inline-flex h-[26px] items-center justify-center rounded-[7px]"
                >
                  <IconAlignLeft size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span>翻页动效</span>
              <div
                className="grid w-[124px] grid-cols-2 gap-1 rounded-[9px] p-[2px]"
                style={{ background: 'var(--r-control)' }}
              >
                <button
                  type="button"
                  onClick={() => updateSettings({ pageAnimation: 'slide' })}
                  style={
                    settings.pageAnimation === 'slide'
                      ? { background: 'var(--r-bg)', color: 'var(--r-ink)' }
                      : { color: 'var(--r-ink-muted)' }
                  }
                  className="h-[26px] rounded-[7px] text-[12px] font-medium"
                >
                  平滑
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings({ pageAnimation: 'none' })}
                  style={
                    settings.pageAnimation === 'none'
                      ? { background: 'var(--r-bg)', color: 'var(--r-ink)' }
                      : { color: 'var(--r-ink-muted)' }
                  }
                  className="h-[26px] rounded-[7px] text-[12px] font-medium"
                >
                  无
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>首行缩进</span>
              <AppleSwitch
                checked={settings.firstLineIndent}
                onCheckedChange={(firstLineIndent) =>
                  updateSettings({ firstLineIndent })
                }
                ariaLabel="首行缩进"
              />
            </div>

            <div className="flex items-center justify-between">
              <span>页眉与页脚</span>
              <AppleSwitch
                checked={settings.showHeaderFooter}
                onCheckedChange={(showHeaderFooter) =>
                  updateSettings({ showHeaderFooter })
                }
                ariaLabel="显示页眉与页脚"
              />
            </div>

            <div className="flex items-center justify-between">
              <span>左手翻页</span>
              <AppleSwitch
                checked={settings.tapZoneLayout === 'left-handed'}
                onCheckedChange={(on) =>
                  updateSettings({
                    tapZoneLayout: on ? 'left-handed' : 'default',
                  })
                }
                ariaLabel="左手点击翻页"
              />
            </div>
          </div>

          <div className="pt-2" style={{ borderTop: '1px solid var(--r-divider)' }}>
            <button
              type="button"
              onClick={() => {
                resetReaderSettings();
                toast.show('已恢复默认排版');
              }}
              style={{ background: 'var(--r-control)', color: 'var(--r-ink)' }}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[11px] text-[13px] font-medium transition-opacity hover:opacity-85"
            >
              <IconRotateCcw size={14} />
              <span>恢复默认</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isCompact) {
    return (
      <>
        {trigger}
        <GlassModal
          open={open}
          onOpenChange={onOpenChange}
          title="排版与外观"
          variant="sheet"
          surface="reader"
        >
          {panelBody}
        </GlassModal>
      </>
    );
  }

  return (
    <GlassPopover
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      align="end"
      side="bottom"
      sideOffset={12}
      surface="reader"
      className="max-h-[calc(100dvh-100px)] w-[348px] overflow-y-auto"
    >
      {panelBody}
    </GlassPopover>
  );
}

interface SliderRowProps {
  label: string;
  valueText: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function SliderRow({
  label,
  valueText,
  value,
  min,
  max,
  step,
  onChange,
}: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[12px]">
        <span style={{ color: 'var(--r-ink-muted)' }}>{label}</span>
        <span className="font-medium tabular-nums">{valueText}</span>
      </div>
      <AppleSlider
        value={value}
        min={min}
        max={max}
        step={step}
        ariaLabel={label}
        surface="reader"
        onChange={onChange}
      />
    </div>
  );
}
