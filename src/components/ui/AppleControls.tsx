import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';

export interface AppleSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  surface?: 'ui' | 'reader';
  className?: string;
}

export function AppleSlider({
  value,
  min,
  max,
  step = 1,
  ariaLabel,
  onChange,
  onCommit,
  surface = 'reader',
  className = '',
}: AppleSliderProps) {
  const trackBg = surface === 'reader' ? 'var(--r-control)' : 'var(--fill-control)';
  const rangeBg = surface === 'reader' ? 'var(--r-progress)' : 'var(--accent)';

  return (
    <Slider.Root
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([next]) => {
        if (typeof next === 'number') onChange(next);
      }}
      onValueCommit={([next]) => {
        if (typeof next === 'number' && onCommit) onCommit(next);
      }}
      className={[
        'relative flex h-5 w-full touch-none select-none items-center cursor-pointer',
        className,
      ].join(' ')}
    >
      <Slider.Track
        className="relative h-1 grow overflow-hidden rounded-full"
        style={{ background: trackBg }}
      >
        <Slider.Range
          className="absolute h-full rounded-full"
          style={{ background: rangeBg }}
        />
      </Slider.Track>
      <Slider.Thumb
        aria-label={ariaLabel}
        className={[
          'block h-[17px] w-[17px] rounded-full bg-white',
          'border border-black/15 shadow-[0_2px_6px_rgba(0,0,0,0.24)]',
          'transition-transform duration-150 ease-[var(--ease-apple)]',
          'hover:scale-110 active:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
        ].join(' ')}
      />
    </Slider.Root>
  );
}

export interface AppleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
  surface?: 'ui' | 'reader';
}

export function AppleSwitch({
  checked,
  onCheckedChange,
  ariaLabel,
  surface = 'reader',
}: AppleSwitchProps) {
  const offBg = surface === 'reader' ? 'var(--r-control)' : 'var(--fill-control)';

  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      style={{ background: checked ? 'var(--success)' : offBg }}
      className="relative inline-flex h-[24px] w-[42px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-200 ease-[var(--ease-apple)]"
    >
      <Switch.Thumb
        className={[
          'block h-[20px] w-[20px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.26)]',
          'transition-transform duration-200 ease-[var(--ease-apple)]',
          checked ? 'translate-x-[18px]' : 'translate-x-0',
        ].join(' ')}
      />
    </Switch.Root>
  );
}
