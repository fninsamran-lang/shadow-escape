import React from 'react';
import { MissionObjective, LevelConfig, Difficulty } from '../types';
import { CheckCircle2, Circle, Target, Key, Terminal, FileCode2, DoorOpen, ShieldCheck, Zap } from 'lucide-react';
import { DIFFICULTY_CONFIGS } from '../utils/gameData';

interface MissionChecklistProps {
  levelConfig: LevelConfig;
  objectives: MissionObjective[];
  difficulty: Difficulty;
  allCompleted: boolean;
}

export const MissionChecklist: React.FC<MissionChecklistProps> = ({
  levelConfig,
  objectives,
  difficulty,
  allCompleted,
}) => {
  const getObjectiveIcon = (type: MissionObjective['type'], completed: boolean) => {
    const iconClass = `w-3.5 h-3.5 ${completed ? 'text-emerald-400' : 'text-slate-400'}`;
    switch (type) {
      case 'key':
        return <Key className={iconClass} />;
      case 'card':
        return <Zap className={iconClass} />;
      case 'terminal':
        return <Terminal className={iconClass} />;
      case 'intel':
        return <FileCode2 className={iconClass} />;
      case 'exit':
        return <DoorOpen className={iconClass} />;
      default:
        return <Target className={iconClass} />;
    }
  };

  const diffCfg = DIFFICULTY_CONFIGS[difficulty];

  return (
    <div
      id="mission-checklist-panel"
      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 text-slate-100 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
    >
      {/* Level Info & Header */}
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            LEVEL {levelConfig.levelNumber} / 3
          </span>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${diffCfg.badgeColor}`}>
            {diffCfg.name} DIFFICULTY
          </span>
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            // {levelConfig.codeName}
          </span>
        </div>

        <h2 className="text-sm sm:text-base font-mono font-bold text-slate-100 mt-1 flex items-center gap-1.5">
          <Target className="w-4 h-4 text-cyan-400" />
          <span>{levelConfig.titleTh}</span>
        </h2>
        <p className="text-xs text-slate-400 font-sans line-clamp-1">
          {levelConfig.descriptionTh}
        </p>
      </div>

      {/* Objectives Live Checklist */}
      <div className="w-full md:w-auto flex-1 max-w-xl">
        <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            MISSION CHECKLIST (เป้าหมายภารกิจ):
          </span>
          <span className={`font-mono ${allCompleted ? 'text-emerald-400 font-bold animate-pulse' : 'text-amber-400'}`}>
            {objectives.filter((o) => o.completed).length} / {objectives.length} สำเร็จ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {objectives.map((obj) => (
            <div
              key={obj.id}
              className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                obj.completed
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}
            >
              {obj.completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
              <div className="flex items-center gap-1.5 truncate">
                {getObjectiveIcon(obj.type, obj.completed)}
                <span className={`truncate text-[11px] ${obj.completed ? 'line-through text-slate-400' : 'font-medium text-slate-200'}`}>
                  {obj.titleTh}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
