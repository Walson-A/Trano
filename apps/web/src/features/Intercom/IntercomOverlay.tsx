import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { WsIntercomMessage } from '@trano/shared';

/** Ding-dong d'interphone via WebAudio — aucun fichier audio nécessaire */
function playChime(): void {
  try {
    const ctx = new AudioContext();
    const notes = [880, 660, 880, 660];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.35 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.35 + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.35);
      osc.stop(ctx.currentTime + i * 0.35 + 0.34);
    });
    setTimeout(() => ctx.close(), 2500);
  } catch {
    // audio bloqué (autoplay) : l'overlay visuel suffit
  }
}

interface IntercomOverlayProps {
  message: WsIntercomMessage | null;
  onDismiss: () => void;
}

export function IntercomOverlay({ message, onDismiss }: IntercomOverlayProps) {
  useEffect(() => {
    if (!message) return;
    playChime();
    navigator.vibrate?.([300, 150, 300, 150, 600]);
    const timer = setTimeout(onDismiss, 20_000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-zinc-950/80"
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.7, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="flex flex-col items-center text-center max-w-lg"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 8, 0] }}
              transition={{ duration: 0.7, repeat: 2, repeatDelay: 1.2 }}
              className="w-28 h-28 rounded-[2rem] flex items-center justify-center text-6xl mb-6 shadow-2xl"
              style={{ backgroundColor: `${message.from.color}33`, border: `3px solid ${message.from.color}` }}
            >
              {message.from.avatar}
            </motion.div>
            <p className="text-xl font-semibold mb-3" style={{ color: message.from.color }}>
              {message.from.name} dit :
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-white leading-snug">
              « {message.message} »
            </p>
            <p className="text-sm text-zinc-500 mt-8">Touchez pour fermer</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
