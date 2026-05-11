const colors = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
  'bg-indigo-500', 'bg-orange-500',
];

export function PlayerAvatar({ name, size = 'md', alive = true }: { name: string; size?: 'sm' | 'md' | 'lg'; alive?: boolean }) {
  const initial = name.charAt(0).toUpperCase();
  const colorIdx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const sizeClasses = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-14 h-14 text-xl' };

  return (
    <div className={`${sizeClasses[size]} ${colors[colorIdx]} rounded-full flex items-center justify-center font-bold text-white shrink-0 ${!alive ? 'opacity-30 grayscale' : ''}`}>
      {initial}
    </div>
  );
}
