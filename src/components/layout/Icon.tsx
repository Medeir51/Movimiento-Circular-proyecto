export type IconName =
  | 'play'
  | 'pause'
  | 'reset'
  | 'back'
  | 'forward'
  | 'gear'
  | 'share'
  | 'info'
  | 'pin'
  | 'close'
  | 'copy'
  | 'print'
  | 'chevronUp'
  | 'chevronDown'
  | 'simulator'
  | 'formulas'
  | 'applications'
  | 'exercises'
  | 'help'
  | 'ccw'
  | 'cw'
  | 'check';

const PATHS: Record<IconName, string> = {
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z',
  reset: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5',
  back: 'M6.5 6v12M18 6l-8 6 8 6z',
  forward: 'M17.5 6v12M6 6l8 6-8 6z',
  gear: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13.5l1.8 1.4-1.9 3.3-2.2-.8a7.6 7.6 0 0 1-1.9 1.1l-.3 2.3h-3.8l-.3-2.3a7.6 7.6 0 0 1-1.9-1.1l-2.2.8-1.9-3.3 1.8-1.4a7.7 7.7 0 0 1 0-2.9L2.8 9.1l1.9-3.3 2.2.8a7.6 7.6 0 0 1 1.9-1.1L9.1 3.2h3.8l.3 2.3a7.6 7.6 0 0 1 1.9 1.1l2.2-.8 1.9 3.3-1.8 1.4a7.7 7.7 0 0 1 0 2.9z',
  share:
    'M18 8a3 3 0 1 0-2.9-3.7L8.9 8a3 3 0 1 0 0 4l6.2 3.7A3 3 0 1 0 18 13M8.9 10.1 15.1 13.9M8.9 10l6.2-3.9',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5',
  pin: 'M14.5 3.5l6 6-2.6 1.2-3.6 3.6.5 4.2-1.8 1.8-3.8-4.6-4.7 4.8-.5-.5 4.8-4.7-4.6-3.8 1.8-1.8 4.2.5 3.6-3.6z',
  close: 'M6 6l12 12M18 6 6 18',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  print: 'M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  chevronUp: 'M6 15l6-6 6 6',
  chevronDown: 'M6 9l6 6 6-6',
  simulator: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 12l5-3M12 12h.01M19 5l1.5-1.5',
  formulas: 'M17 5H7l5 7-5 7h10',
  applications: 'M4 18c3-9 13-9 16 0M7 18v-1.5M12 12V9M17 18v-1.5',
  exercises: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.8M12 17v.5',
  ccw: 'M5 12a7 7 0 1 0 2-4.9M5 4v4h4',
  cw: 'M19 12a7 7 0 1 1-2-4.9M19 4v4h-4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
};

const FILLED: ReadonlySet<IconName> = new Set<IconName>(['play', 'pause']);

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
