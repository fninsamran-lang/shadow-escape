import React from 'react';
import { Key, EyeOff, DoorOpen, Clock, Gamepad2, X, ShieldAlert, CheckCircle2, Terminal, FileCode2, Zap, Shield } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame?: () => void;
  isGameStarted?: boolean;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  isGameStarted,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-2xl text-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono tracking-wide text-white">
                คู่มือการเล่น (HOW TO PLAY)
              </h2>
              <p className="text-xs text-slate-400">
                คู่มือภารกิจสายลับ Shadow Escape ทั้ง 3 ด่าน
              </p>
            </div>
          </div>
          <button
            id="btn-close-help"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mt-4 space-y-3 font-sans text-sm overflow-y-auto pr-1">
          {/* Controls */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="p-2 rounded-lg bg-cyan-900/40 text-cyan-300 shrink-0">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 text-xs sm:text-sm font-mono flex items-center gap-1.5">
                <span>1. การบังคับตัวละคร</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">WASD / ARROWS</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ใช้ปุ่ม <strong className="text-slate-200">W, A, S, D</strong> หรือ <strong className="text-slate-200">ปุ่มลูกศร</strong> บนคีย์บอร์ด หรือแตะ <strong className="text-cyan-400">ปุ่มควบคุมบนจอมือถือ</strong>
              </p>
            </div>
          </div>

          {/* 3 Level Missions Briefing */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-cyan-500/30 space-y-2">
            <h3 className="font-mono font-bold text-xs text-cyan-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>ภารกิจหลักทั้ง 3 ด่าน (3 MISSION LEVELS)</span>
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start gap-2">
                <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-300 font-mono text-[11px]">LEVEL 1: INFILTRATION</div>
                  <div className="text-slate-300 text-[11px]">ลอบเร้นเข้าไปใน Vault เก็บ <strong className="text-amber-400">Security Key</strong> แล้วหนีออกประตูทางออก EXIT</div>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start gap-2">
                <Terminal className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-cyan-300 font-mono text-[11px]">LEVEL 2: CYBER INTRUSION</div>
                  <div className="text-slate-300 text-[11px]">หา <strong className="text-cyan-400">Access Card</strong> + แฮก <strong className="text-emerald-400">Security Terminal 2 จุด</strong> เพื่อปลดล็อกประตู EXIT</div>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start gap-2">
                <FileCode2 className="w-4 h-4 text-fuchsia-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-fuchsia-300 font-mono text-[11px]">LEVEL 3: CLASSIFIED HEIST</div>
                  <div className="text-slate-300 text-[11px]">แฮก Mainframe กลาง, ขโมย <strong className="text-fuchsia-400">Classified Data</strong>, หา <strong className="text-yellow-400">Master Key</strong> และหนีออกจากอาคาร</div>
                </div>
              </div>
            </div>
          </div>

          {/* Guard & Cover */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="p-2 rounded-lg bg-rose-900/40 text-rose-300 shrink-0">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 text-xs sm:text-sm font-mono">
                การลอบเร้นและหลบสายตายาม (Stealth & Cover)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ยามเดินลาดตระเวนพร้อมไฟฉาย หากเข้าใกล้หรืออยู่ในแสงไฟ ค่า <strong className="text-rose-400">Alert Gauge</strong> จะพุ่งขึ้น หากเต็ม 100% จะแพ้ทันที! ให้ใช้กำแพง เสา และกล่องสินค้าเป็นที่กำบัง
              </p>
            </div>
          </div>

          {/* Difficulty Rules */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
            <div className="font-mono font-bold text-slate-200 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>ระดับความยาก (DIFFICULTY):</span>
            </div>
            <div className="text-[11px] text-slate-400 pl-4 space-y-0.5">
              <div>• <strong>Easy:</strong> 80s, ยามน้อย, สายตาสั้น, Alert ขึ้นช้า</div>
              <div>• <strong>Normal:</strong> 60s, ยามมาตรฐาน, Alert ปานกลาง (x1.3 Score)</div>
              <div>• <strong>Hard:</strong> 40s, ยามเยอะและเดินไว, Alert พุ่งเร็ว (x1.8 Score)</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 shrink-0">
          <button
            id="btn-understand-help"
            onClick={() => {
              onClose();
              if (onStartGame && !isGameStarted) {
                onStartGame();
              }
            }}
            className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-sm tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isGameStarted ? 'กลับสู่เกม (RESUME)' : 'เข้าใจแล้ว เริ่มเล่นเลย (START)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
