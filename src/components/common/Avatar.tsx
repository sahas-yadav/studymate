import { useState } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  isOnline?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-xl',
};

const BG_PALETTES = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
];

export function Avatar({ src, name, size = 'md', showOnline = false, isOnline = false }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = (name || 'S')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const colorIdx = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % BG_PALETTES.length;

  return (
    <div className="relative inline-flex shrink-0">
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${SIZE_CLASSES[size]} rounded-full object-cover border border-slate-200 dark:border-slate-700`}
        />
      ) : (
        <div
          aria-label={name}
          className={`${SIZE_CLASSES[size]} ${BG_PALETTES[colorIdx]} rounded-full font-display font-bold flex items-center justify-center border border-slate-200/70 dark:border-slate-700/70`}
        >
          {initials || 'SM'}
        </div>
      )}
      {showOnline && (
        <span
          title={isOnline ? 'Online' : 'Offline'}
          aria-label={isOnline ? 'Online' : 'Offline'}
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
            isOnline ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        />
      )}
    </div>
  );
}
