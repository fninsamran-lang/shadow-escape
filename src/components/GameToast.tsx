import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Unlock, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';
import { GameNotification } from '../types';

interface GameToastProps {
  notifications: GameNotification[];
}

export const GameToast: React.FC<GameToastProps> = ({ notifications }) => {
  return (
    <div
      id="game-toast-container"
      className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4"
    >
      <AnimatePresence>
        {notifications.map((notif) => {
          const isKey = notif.type === 'key';
          const isUnlocked = notif.type === 'unlocked';
          const isAlert = notif.type === 'alert';
          const isLocked = notif.type === 'locked';

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border shadow-2xl backdrop-blur-md ${
                isKey
                  ? 'bg-amber-950/90 border-amber-500/80 text-amber-100 shadow-amber-900/50'
                  : isUnlocked
                  ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100 shadow-emerald-900/50'
                  : isAlert
                  ? 'bg-rose-950/90 border-rose-500/80 text-rose-100 shadow-rose-900/50'
                  : 'bg-slate-900/90 border-slate-700 text-slate-200 shadow-black/60'
              }`}
            >
              <div
                className={`p-1.5 rounded-md ${
                  isKey
                    ? 'bg-amber-500/20 text-amber-400'
                    : isUnlocked
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isAlert
                    ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isKey && <Key className="w-5 h-5" />}
                {isUnlocked && <Unlock className="w-5 h-5" />}
                {isAlert && <ShieldAlert className="w-5 h-5" />}
                {isLocked && <Lock className="w-5 h-5" />}
              </div>

              <div className="flex flex-col">
                <span className="font-mono font-bold text-sm tracking-wide uppercase">
                  {notif.title}
                </span>
                {notif.subtitle && (
                  <span className="text-xs text-slate-300 font-sans">{notif.subtitle}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
