import type { SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: number;
}

function SvgIcon({
  size = 19,
  className,
  children,
  ...rest
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </SvgIcon>
  );
}

export function IconList(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </SvgIcon>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </SvgIcon>
  );
}

export function IconSearchPlus(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
      <path d="M11 8v6M8 11h6" />
    </SvgIcon>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 15V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </SvgIcon>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.25.4-1.51 1Z" />
    </SvgIcon>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </SvgIcon>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </SvgIcon>
  );
}

export function IconToc(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 6h16M4 12h11M4 18h14" />
    </SvgIcon>
  );
}

export function IconTypographyAa(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 19 9.5 5 15 19" />
      <path d="M6.2 14h6.6" />
      <path d="M16.5 13.5c.6-1 1.6-1.5 2.7-1.5 1.6 0 2.8 1 2.8 2.6V19" />
      <path d="M22 16.5c-.8-.4-1.7-.6-2.7-.5-1.4.1-2.3.8-2.3 1.8 0 1 .9 1.6 2 1.6 1.4 0 2.5-.8 3-1.9" />
    </SvgIcon>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </SvgIcon>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </SvgIcon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </SvgIcon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </SvgIcon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </SvgIcon>
  );
}

export function IconMoreHorizontal(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </SvgIcon>
  );
}

export function IconBookOpen(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H9a3 3 0 0 1 3 3v14a2.5 2.5 0 0 0-2.5-2.5H4.5A2.5 2.5 0 0 1 2 15V5.5Z" />
      <path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H15a3 3 0 0 0-3 3v14a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 0 22 15V5.5Z" />
    </SvgIcon>
  );
}

export function IconScrollMode(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </SvgIcon>
  );
}

export function IconPageMode(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 5v14" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </SvgIcon>
  );
}

export function IconColumns(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M12 4v16" />
    </SvgIcon>
  );
}

export function IconSun(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </SvgIcon>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </SvgIcon>
  );
}

export function IconWifi(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <path d="M12 20h.01" />
    </SvgIcon>
  );
}

export function IconAlertCircle(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </SvgIcon>
  );
}

export function IconFont(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 7V5h16v2" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </SvgIcon>
  );
}

export function IconAlignLeft(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 6h16M4 12h10M4 18h14" />
    </SvgIcon>
  );
}

export function IconAlignJustify(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </SvgIcon>
  );
}

export function IconRotateCcw(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </SvgIcon>
  );
}

export function IconArrowUpDown(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </SvgIcon>
  );
}

export function IconCloud(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </SvgIcon>
  );
}

export function IconFullscreen(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 9V4h5" />
      <path d="M20 9V4h-5" />
      <path d="M4 15v5h5" />
      <path d="M20 15v5h-5" />
    </SvgIcon>
  );
}

export function IconFullscreenExit(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M9 4v5H4" />
      <path d="M15 4v5h5" />
      <path d="M9 20v-5H4" />
      <path d="M15 20v-5h5" />
    </SvgIcon>
  );
}
