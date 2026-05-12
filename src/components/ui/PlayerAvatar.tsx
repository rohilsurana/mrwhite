const colors = [
  'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-pink-600', 'bg-teal-600',
  'bg-indigo-600', 'bg-orange-600',
];

export function PlayerAvatar({ name, size = 'md', alive = true }: { name: string; size?: 'sm' | 'md' | 'lg'; alive?: boolean }) {
  const initial = name.charAt(0).toUpperCase();
  const colorIdx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const sizeClasses = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-lg' };

  return (
    <div className={`${sizeClasses[size]} ${colors[colorIdx]} rounded-full flex items-center justify-center font-semibold text-white shrink-0 ${!alive ? 'opacity-25' : ''}`}>
      {initial}
    </div>
  );
}
