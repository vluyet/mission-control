type IconProps = {
  className?: string;
};

function cls(className?: string) {
  return className ?? "h-4 w-4";
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
    </svg>
  );
}

export function InboxIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M4 5h16v14H4z" />
      <path d="M4 14h4l2 3h4l2-3h4" />
    </svg>
  );
}

export function StackIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M12 4 4 8l8 4 8-4-8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </svg>
  );
}

export function FolderIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M3.5 7.5h5l2 2H20.5v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export function BoardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <rect x="4" y="5" width="5" height="14" rx="1.5" />
      <rect x="10.5" y="5" width="4" height="8" rx="1.5" />
      <rect x="16" y="5" width="4" height="11" rx="1.5" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M16 19a4 4 0 1 0-8 0" />
      <circle cx="12" cy="9" r="3.5" />
      <path d="M19.5 18a3.5 3.5 0 0 0-2.5-3.35" />
      <path d="M7 14.65A3.5 3.5 0 0 0 4.5 18" />
    </svg>
  );
}

export function PulseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M3 12h4l2.5-5 5 10 2.5-5H21" />
    </svg>
  );
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5L12 3Z" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
      <path d="M3 19h18" />
    </svg>
  );
}

export function BookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M6 5.5A2.5 2.5 0 0 1 8.5 3H20v15.5a2.5 2.5 0 0 0-2.5-2.5H6Z" />
      <path d="M6 5.5v15A2.5 2.5 0 0 1 3.5 18V8A2.5 2.5 0 0 1 6 5.5Z" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M6 16.5h12l-1.5-2.5v-3.5a4.5 4.5 0 1 0-9 0V14z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function DotsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cls(className)}>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" />
      <path d="M19 12a7 7 0 0 0-.08-1l2.02-1.57-2-3.46-2.45.8a7.28 7.28 0 0 0-1.73-1L14.5 3h-5l-.26 2.77a7.28 7.28 0 0 0-1.73 1l-2.45-.8-2 3.46L5.08 11a7 7 0 0 0 0 2l-2.02 1.57 2 3.46 2.45-.8a7.28 7.28 0 0 0 1.73 1L9.5 21h5l.26-2.77a7.28 7.28 0 0 0 1.73-1l2.45.8 2-3.46L18.92 13c.05-.33.08-.66.08-1Z" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M7 3.5v4" />
      <path d="M17 3.5v4" />
      <path d="M3.5 9.5h17" />
    </svg>
  );
}

export function MessageIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="M5 18.5V6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H9l-4 2.5Z" />
    </svg>
  );
}

export function ActivityIcon({ className }: IconProps) {
  return <PulseIcon className={className} />;
}

export function PaperclipIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cls(className)}>
      <path d="m8.5 12.5 6-6a3 3 0 1 1 4.24 4.24l-7 7a5 5 0 0 1-7.07-7.07l7-7" />
    </svg>
  );
}
