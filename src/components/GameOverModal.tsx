import React from 'react';
import { RotateCcw, Trophy, ShieldAlert, Clock, Key, Award, Sparkles, AlertTriangle, ArrowRight, CheckCircle2, Zap, FileCode2, Terminal, Shield } from 'lucide-react';
import { GameStats } from '../types';
import { DIFFICULTY_CONFIGS, LEVELS } from '../utils/gameData';

interface GameOverModalProps {
  stats: GameStats;
  onRestart: () => void;
  onNextLevel: () => void;
  onRestartAll: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onRestart,
  onNextLevel,
  onRestartAll,
}) => {
  if (stats.status === 'playing' || stats.status === 'idle') return null;

  const isOperationComplete = stats.status === 'operation_complete';
  const isLevelVictory = stats.status === 'victory';
  const isSuccess = isLevelVictory || isOperationComplete;
  const isDetected = stats.status === 'gameover_detected';
  const currentLevelConfig = LEVELS[stats.currentLevel];
  const diffCfg = DIFFICULTY_CONFIGS[stats.difficulty];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div
        className={`relative w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl text-slate-100 border overflow-hidden ${
          isOperationComplete
            ? 'bg-slate-900/95 border-amber-500/70 shadow-[0_0_50px_rgba(245,158,11,0.3)]'
            : isLevelVictory
            ? 'bg-slate-900/95 border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.25)]'
            : 'bg-slate-900/95 border-rose-600/60 shadow-[0_0_40px_rgba(225,29,72,0.25)]'
        }`}
      >
        {/* Glow ambient */}
        <div
          className={`absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40 ${
            isOperationComplete ? 'bg-amber-500' : isLevelVictory ? 'bg-emerald-500' : 'bg-rose-600'
          }`}
        />

        {/* Top Header Badge */}
        <div className="text-center">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 shadow-lg ${
              isOperationComplete
                ? 'bg-amber-950/80 border-2 border-amber-400 text-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)] animate-bounce'
                : isLevelVictory
                ? 'bg-emerald-950/80 border-2 border-emerald-400 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                : 'bg-rose-950/80 border-2 border-rose-500 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
            }`}
          >
            {isOperationComplete ? (
              <Trophy className="w-9 h-9" />
            ) : isLevelVictory ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : isDetected ? (
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            ) : (
              <Clock className="w-8 h-8 animate-pulse" />
            )}
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${diffCfg.badgeColor}`}>
              DIFFICULTY: {diffCfg.name}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              LEVEL {stats.currentLevel} OF 3
            </span>
          </div>

          <h2
            className={`text-2xl sm:text-3xl font-bold font-mono tracking-wider uppercase ${
              isOperationComplete
                ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                : isLevelVictory
                ? 'text-emerald-400'
                : 'text-rose-500'
            }`}
          >
            {isOperationComplete
              ? 'OPERATION COMPLETE!'
              : isLevelVictory
              ? `LEVEL ${stats.currentLevel} COMPLETE!`
              : 'MISSION FAILED'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-sans mt-1">
            {isOperationComplete
              ? `ยินดีด้วย! คุณผ่านภารกิจสายลับครบทั้ง 3 ด่านในระดับความยาก ${diffCfg.nameTh} สำเร็จอย่างสมบูรณ์แบบ!`
              : isLevelVictory
              ? `ภารกิจ ${currentLevelConfig.titleTh} สำเร็จแล้ว พร้อมสำหรับภารกิจถัดไป!`
              : isDetected
              ? 'ยามรักษาความปลอดภัยตรวจพบตัวคุณและส่งสัญญาณเตือนภัย Alert 100%!'
              : 'หมดเวลาปฏิบัติการ ระบบรักษาความปลอดภัยปิดล็อกทั้งอาคาร!'}
          </p>
        </div>

        {/* Victory Score Breakdown */}
        {isSuccess ? (
          <div className="mt-4 space-y-3 font-mono">
            {/* Rank Badge */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                <div>
                  <div className="text-[10px] text-slate-400">AGENT PERFORMANCE RANK</div>
                  <div className="text-xs font-semibold text-emerald-400">
                    {stats.rank === 'S'
                      ? 'GHOST INFILTRATOR'
                      : stats.rank === 'A'
                      ? 'MASTER OPERATIVE'
                      : stats.rank === 'B'
                      ? 'SHADOW AGENT'
                      : 'SURVIVOR'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">
                  {stats.rank}
                </span>
              </div>
            </div>

            {/* Score Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>เวลาคงเหลือ</span>
                </div>
                <div className="text-base font-bold text-slate-100 mt-0.5">
                  {Math.ceil(stats.timeRemaining)}s
                </div>
                <div className="text-[10px] text-cyan-400">+{stats.timeBonus} PTS</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stealth Rating</span>
                </div>
                <div className="text-base font-bold text-slate-100 mt-0.5">
                  {stats.detection < 25 ? 'PERFECT GHOST' : `${Math.round(100 - stats.detection)}% COVERT`}
                </div>
                <div className="text-[10px] text-emerald-400">+{stats.stealthBonus} PTS</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Difficulty Mult.</span>
                </div>
                <div className="text-base font-bold text-amber-300 mt-0.5">
                  {diffCfg.name} (x{diffCfg.scoreMultiplier})
                </div>
                <div className="text-[10px] text-amber-400">MISSION CLEARED</div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                <div className="text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{isOperationComplete ? 'คะแนนรวมทั้งหมด' : 'คะแนนด่านนี้'}</span>
                </div>
                <div className="text-lg font-extrabold text-yellow-300 mt-0.5">
                  {isOperationComplete ? stats.totalScore : stats.score}
                </div>
                <div className="text-[10px] text-emerald-400 font-bold">
                  {isOperationComplete ? 'TOTAL CAMPAIGN SCORE' : 'LEVEL SCORE'}
                </div>
              </div>
            </div>

            {/* If Operation Complete, show per-level breakdown */}
            {isOperationComplete && stats.levelScores && stats.levelScores.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono">
                <div className="text-slate-400 mb-1 font-bold">LEVEL BREAKDOWN (สรุปคะแนนรายด่าน):</div>
                <div className="space-y-1">
                  {stats.levelScores.map((sc, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-300">
                      <span>LEVEL {idx + 1}: {LEVELS[(idx + 1) as 1 | 2 | 3]?.titleTh}</span>
                      <span className="font-bold text-yellow-400">+{sc} PTS</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Defeat Advice */
          <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-rose-400 font-mono font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>TACTICAL TIP (คำแนะนำการเล่น)</span>
            </div>
            <p className="text-slate-300 font-sans leading-relaxed">
              • หลบหลังกำแพง เสา หรือลังสินค้า เพื่อตัดสายตาไฟฉายของยาม
              <br />
              • สังเกตรอบการเดินของยาม และอาศัยช่วงที่ยามหันหลังเดินเข้าเป้าหมาย
              <br />
              • หากเริ่มมีสัญญาณเตือนภัย Alert ให้รีบถอยห่างจากพื้นที่ส่องไฟทันที
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          {/* If Level 1 or 2 Victory -> Show Next Level */}
          {isLevelVictory && stats.currentLevel < 3 && (
            <button
              id="btn-next-level"
              onClick={onNextLevel}
              className="w-full py-3 px-6 rounded-xl font-mono font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all transform active:scale-98 cursor-pointer"
            >
              <span>ไปยังด่านถัดไป (NEXT LEVEL {stats.currentLevel + 1})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* If Operation Complete -> Play Again */}
          {isOperationComplete && (
            <button
              id="btn-play-again-all"
              onClick={onRestartAll}
              className="w-full py-3 px-6 rounded-xl font-mono font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all transform active:scale-98 cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              <span>เล่นใหม่อีกครั้ง / เลือกระดับความยาก (PLAY AGAIN)</span>
            </button>
          )}

          {/* Retry current level / replay */}
          {!isOperationComplete && (
            <button
              id="btn-restart-modal"
              onClick={onRestart}
              className={`w-full py-2.5 px-6 rounded-xl font-mono font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer ${
                isLevelVictory
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.5)]'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isLevelVictory ? 'เล่นด่านนี้ใหม่ (RETRY LEVEL)' : 'ลองใหม่อีกครั้ง (RETRY MISSION)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
