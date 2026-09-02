import React from 'react';
import { Volume2, VolumeX, RotateCcw, HelpCircle, ShieldAlert, Key, Clock, Award, Shield, Zap, FileCode2, Terminal } from 'lucide-react';
import { GameStats, Difficulty } from '../types';
import { DIFFICULTY_CONFIGS, LEVELS } from '../utils/gameData';

interface GameHeaderProps {
  stats: GameStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onRestart: () => void;
  onOpenHelp: () => void;
  onSelectDifficulty?: (diff: Difficulty) => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  stats,
  isMuted,
  onToggleMute,
  onRestart,
  onOpenHelp,
}) => {
  const getDetectionStatusText = (val: number) => {
    if (val >= 85) return 'CRITICAL ALERT!';
    if (val >= 70) return 'SPOTTED!';
    if (val >= 35) return 'SUSPICIOUS';
    return 'STEALTH';
  };

  const isLowTime = stats.timeRemaining <= 12;
  const diffCfg = DIFFICULTY_CONFIGS[stats.difficulty];
  const levelCfg = LEVELS[stats.currentLevel];

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur border-b border-slate-800 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg select-none">
      {/* Brand & Level Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <span className="font-mono font-bold text-sm tracking-tighter">SE</span>
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-75" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase font-mono">
                Shadow Escape
              </h1>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-900/70 border border-cyan-500/40 text-cyan-300">
                LVL {stats.currentLevel}/3
              </span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${diffCfg.badgeColor}`}>
                {diffCfg.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wide hidden sm:block">
              {levelCfg.titleTh}
            </p>
          </div>
        </div>
      </div>

      {/* Center Game HUD Metrics */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center max-w-xl">
        {/* Detection Meter Bar */}
        <div className="flex-1 max-w-[180px] sm:max-w-xs bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
          <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono mb-1">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-slate-300" />
              <span>ALERT</span>
            </span>
            <span
              className={`font-bold tracking-wider ${
                stats.detection >= 70
                  ? 'text-rose-400 animate-pulse'
                  : stats.detection >= 35
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {getDetectionStatusText(stats.detection)} ({Math.round(stats.detection)}%)
            </span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                stats.detection >= 70
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                  : stats.detection >= 35
                  ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, stats.detection)}%` }}
            />
          </div>
        </div>

        {/* Time Remaining */}
        <div
          className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold ${
            isLowTime
              ? 'bg-rose-950/60 border-rose-500 text-rose-400 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.4)]'
              : 'bg-slate-950/80 border-slate-800 text-cyan-400'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-rose-400' : 'text-cyan-400'}`} />
          <span>{Math.ceil(stats.timeRemaining)}s</span>
        </div>

        {/* Current Score */}
        <div className="hidden md:flex px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950/80 items-center gap-1.5 font-mono text-xs font-semibold text-slate-300">
          <Award className="w-3.5 h-3.5 text-yellow-400" />
          <span>{stats.score} PTS</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          id="btn-help-modal"
          onClick={onOpenHelp}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer"
          title="คู่มือการเล่น (How to Play)"
          aria-label="How to play"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">คู่มือ</span>
        </button>

        <button
          id="btn-sound-toggle"
          onClick={onToggleMute}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer"
          title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
          aria-label="Toggle sound"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          id="btn-restart-header"
          onClick={onRestart}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer"
          title="เริ่มเล่นใหม่ (Restart)"
          aria-label="Restart level"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">เริ่มใหม่</span>
        </button>
      </div>
    </header>
  );
};
