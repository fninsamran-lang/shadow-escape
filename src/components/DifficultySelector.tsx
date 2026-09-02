import React from 'react';
import { Difficulty } from '../types';
import { DIFFICULTY_CONFIGS } from '../utils/gameData';
import { Shield, ShieldAlert, Zap, Clock, Eye, Award } from 'lucide-react';

interface DifficultySelectorProps {
  selectedDifficulty: Difficulty;
  onSelectDifficulty: (diff: Difficulty) => void;
  disabled?: boolean;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  selectedDifficulty,
  onSelectDifficulty,
  disabled = false,
}) => {
  const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          เลือกระดับความยาก (SELECT DIFFICULTY)
        </span>
        <span className="text-[11px] font-mono text-cyan-400 font-semibold">
          {DIFFICULTY_CONFIGS[selectedDifficulty].nameTh}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {difficulties.map((diffKey) => {
          const cfg = DIFFICULTY_CONFIGS[diffKey];
          const isSelected = selectedDifficulty === diffKey;

          return (
            <button
              key={diffKey}
              id={`btn-diff-${diffKey}`}
              disabled={disabled}
              onClick={() => onSelectDifficulty(diffKey)}
              className={`relative p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? diffKey === 'hard'
                    ? 'bg-rose-950/70 border-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.3)] ring-1 ring-rose-500'
                    : diffKey === 'normal'
                    ? 'bg-cyan-950/70 border-cyan-500 shadow-[0_0_18px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500'
                    : 'bg-emerald-950/70 border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850 opacity-80 hover:opacity-100'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-98'}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`font-mono font-extrabold text-sm tracking-wider ${
                    isSelected
                      ? diffKey === 'hard'
                        ? 'text-rose-400'
                        : diffKey === 'normal'
                        ? 'text-cyan-400'
                        : 'text-emerald-400'
                      : 'text-slate-300'
                  }`}
                >
                  {cfg.name}
                </span>

                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/70 border border-slate-700/60 text-slate-300">
                  x{cfg.scoreMultiplier} PTS
                </span>
              </div>

              {/* Title Thai */}
              <div className="text-xs font-semibold text-slate-200 mt-1">
                {diffKey === 'easy' ? 'สายลับฝึกหัด' : diffKey === 'normal' ? 'มืออาชีพ' : 'ระดับฝันร้าย'}
              </div>

              {/* Spec Badges */}
              <div className="mt-2 space-y-1 text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>เวลา: {cfg.timeLimit}s</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>สายตายาม: {diffKey === 'easy' ? 'สั้นลง' : diffKey === 'normal' ? 'มาตรฐาน' : 'กว้าง+เร็ว'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>Alert: {diffKey === 'easy' ? 'ช้า 0.65x' : diffKey === 'normal' ? 'ปกติ 1.0x' : 'พุ่งไว 1.55x'}</span>
                </div>
              </div>

              {/* Active Indicator Dot */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full animate-ping pointer-events-none bg-current" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
