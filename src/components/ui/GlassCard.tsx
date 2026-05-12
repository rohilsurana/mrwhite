import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}
