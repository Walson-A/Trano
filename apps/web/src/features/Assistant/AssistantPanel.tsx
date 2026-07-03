import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Assistant } from '../../views/Assistant';

/**
 * Assistant accessible partout : bouton flottant + panneau latéral.
 * Le fil de discussion est conservé tant que l'app reste ouverte
 * (le panneau est monté en permanence, juste masqué).
 */
export function AssistantFab({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      aria-label="Ouvrir l'assistant"
      className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[90] w-14 h-14 rounded-full bg-zinc-900 dark:bg-zinc-100 text-amber-500 shadow-2xl shadow-black/30 flex items-center justify-center"
    >
      <Sparkles className="w-6 h-6" />
    </motion.button>
  );
}

export function AssistantPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[95]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/50"
            style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] bg-zinc-50 dark:bg-[#0d0d0d] border-l border-zinc-200 dark:border-white/10 shadow-2xl flex flex-col"
          >
            <button
              onClick={onClose}
              aria-label="Fermer l'assistant"
              className="absolute top-4 right-4 z-10 p-2.5 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 overflow-hidden p-5 sm:p-6">
              <Assistant />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
