import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface MobileControlsProps {
  onDirectionChange: (dir: { up: boolean; down: boolean; left: boolean; right: boolean }) => void;
  activeDirections: { up: boolean; down: boolean; left: boolean; right: boolean };
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onDirectionChange,
  activeDirections,
}) => {
  const handleTouch = (key: 'up' | 'down' | 'left' | 'right', isPressed: boolean) => {
    if (isPressed && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore
      }
    }
    onDirectionChange({
      ...activeDirections,
      [key]: isPressed,
    });
  };

  return (
    <div
      id="mobile-controls-panel"
      className="md:hidden flex flex-col items-center justify-center p-2 select-none touch-none"
    >
      <div className="relative w-44 h-44 sm:w-48 sm:h-48 bg-slate-900/90 rounded-full border-2 border-slate-700/80 p-2 shadow-2xl backdrop-blur-md flex items-center justify-center">
        {/* Center hub decorative */}
        <div className="w-12 h-12 rounded-full bg-slate-950 border border-cyan-500/50 flex flex-col items-center justify-center text-cyan-400 font-mono text-[9px] shadow-[0_0_10px_rgba(6,182,212,0.3)] pointer-events-none">
          <span className="font-bold">DPAD</span>
          <span className="text-[7px] text-slate-500">TOUCH</span>
        </div>

        {/* UP BUTTON */}
        <button
          id="btn-ctrl-up"
          type="button"
          onTouchStart={(e) => { e.preventDefault(); handleTouch('up', true); }}
          onTouchEnd={(e) => { e.preventDefault(); handleTouch('up', false); }}
          onTouchCancel={(e) => { e.preventDefault(); handleTouch('up', false); }}
          onMouseDown={() => handleTouch('up', true)}
          onMouseUp={() => handleTouch('up', false)}
          onMouseLeave={() => handleTouch('up', false)}
          aria-label="Move Up"
          className={`absolute top-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none touch-none ${
            activeDirections.up
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.8)] scale-95 ring-2 ring-cyan-300'
              : 'bg-slate-800/95 hover:bg-slate-700 active:bg-cyan-600 text-cyan-400 border border-slate-600'
          }`}
        >
          <ChevronUp className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* DOWN BUTTON */}
        <button
          id="btn-ctrl-down"
          type="button"
          onTouchStart={(e) => { e.preventDefault(); handleTouch('down', true); }}
          onTouchEnd={(e) => { e.preventDefault(); handleTouch('down', false); }}
          onTouchCancel={(e) => { e.preventDefault(); handleTouch('down', false); }}
          onMouseDown={() => handleTouch('down', true)}
          onMouseUp={() => handleTouch('down', false)}
          onMouseLeave={() => handleTouch('down', false)}
          aria-label="Move Down"
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none touch-none ${
            activeDirections.down
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.8)] scale-95 ring-2 ring-cyan-300'
              : 'bg-slate-800/95 hover:bg-slate-700 active:bg-cyan-600 text-cyan-400 border border-slate-600'
          }`}
        >
          <ChevronDown className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* LEFT BUTTON */}
        <button
          id="btn-ctrl-left"
          type="button"
          onTouchStart={(e) => { e.preventDefault(); handleTouch('left', true); }}
          onTouchEnd={(e) => { e.preventDefault(); handleTouch('left', false); }}
          onTouchCancel={(e) => { e.preventDefault(); handleTouch('left', false); }}
          onMouseDown={() => handleTouch('left', true)}
          onMouseUp={() => handleTouch('left', false)}
          onMouseLeave={() => handleTouch('left', false)}
          aria-label="Move Left"
          className={`absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none touch-none ${
            activeDirections.left
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.8)] scale-95 ring-2 ring-cyan-300'
              : 'bg-slate-800/95 hover:bg-slate-700 active:bg-cyan-600 text-cyan-400 border border-slate-600'
          }`}
        >
          <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
        </button>

        {/* RIGHT BUTTON */}
        <button
          id="btn-ctrl-right"
          type="button"
          onTouchStart={(e) => { e.preventDefault(); handleTouch('right', true); }}
          onTouchEnd={(e) => { e.preventDefault(); handleTouch('right', false); }}
          onTouchCancel={(e) => { e.preventDefault(); handleTouch('right', false); }}
          onMouseDown={() => handleTouch('right', true)}
          onMouseUp={() => handleTouch('right', false)}
          onMouseLeave={() => handleTouch('right', false)}
          aria-label="Move Right"
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none touch-none ${
            activeDirections.right
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_16px_rgba(6,182,212,0.8)] scale-95 ring-2 ring-cyan-300'
              : 'bg-slate-800/95 hover:bg-slate-700 active:bg-cyan-600 text-cyan-400 border border-slate-600'
          }`}
        >
          <ChevronRight className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>

      <p className="text-[11px] text-slate-400 font-mono mt-2 tracking-wide text-center">
        แตะค้างหรือกดทิศทางเพื่อบังคับสายลับหลบสายตายาม
      </p>
    </div>
  );
};
