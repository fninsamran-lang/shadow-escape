/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Player,
  Guard,
  Wall,
  InteractiveItem,
  ExitDoor,
  Particle,
  GameStatus,
  GameStats,
  GameNotification,
  Difficulty,
  MissionObjective,
} from './types';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  DIFFICULTY_CONFIGS,
  LEVELS,
} from './utils/gameData';
import {
  checkGuardDetection,
  resolveCircleWallCollision,
  updateGuard,
  createSparks,
  updateParticles,
} from './utils/gameLogic';
import { soundEngine } from './utils/audio';
import { GameHeader } from './components/GameHeader';
import { GameCanvas } from './components/GameCanvas';
import { GameToast } from './components/GameToast';
import { MobileControls } from './components/MobileControls';
import { HowToPlayModal } from './components/HowToPlayModal';
import { GameOverModal } from './components/GameOverModal';
import { MissionChecklist } from './components/MissionChecklist';
import { DifficultySelector } from './components/DifficultySelector';
import { Play, Sparkles, HelpCircle, Shield, ArrowRight } from 'lucide-react';

export default function App() {
  // Campaign & Level Configuration
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1);
  const [levelScores, setLevelScores] = useState<number[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [notifications, setNotifications] = useState<GameNotification[]>([]);

  // Current Level Data
  const currentConfig = LEVELS[currentLevel];

  // In-Game Objects for active level
  const [player, setPlayer] = useState<Player>({
    x: currentConfig.playerStart.x,
    y: currentConfig.playerStart.y,
    radius: 12,
    speed: 3.2,
    angle: 0,
    hasKey: false,
    hasCard: false,
    hasIntel: false,
    isMoving: false,
    footstepTimer: 0,
  });

  const [guards, setGuards] = useState<Guard[]>(() => currentConfig.getGuards(difficulty));
  const [walls, setWalls] = useState<Wall[]>(() => [...currentConfig.walls]);
  const [items, setItems] = useState<InteractiveItem[]>(() => JSON.parse(JSON.stringify(currentConfig.items)));
  const [objectives, setObjectives] = useState<MissionObjective[]>(() => currentConfig.getInitialObjectives());
  const [exitDoor, setExitDoor] = useState<ExitDoor>(() => ({ ...currentConfig.exitDoor }));
  const [particles, setParticles] = useState<Particle[]>([]);

  // Meters & Stats
  const diffConfig = DIFFICULTY_CONFIGS[difficulty];
  const [timeRemaining, setTimeRemaining] = useState<number>(diffConfig.timeLimit);
  const [detection, setDetection] = useState<number>(0);
  const [maxDetectionEver, setMaxDetectionEver] = useState<number>(0);

  // Active Directional Keys
  const [activeDirections, setActiveDirections] = useState({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  // Notification helper
  const addNotification = useCallback(
    (title: string, subtitle: string, type: 'key' | 'card' | 'intel' | 'terminal' | 'unlocked' | 'alert' | 'locked') => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newNotif: GameNotification = {
        id,
        title,
        subtitle,
        type,
        timestamp: Date.now(),
      };
      setNotifications((prev) => [...prev.slice(-2), newNotif]);

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 3200);
    },
    []
  );

  // Animation Frame and Audio cooldown refs
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const footstepSoundTimerRef = useRef<number>(0);
  const detectionSoundTimerRef = useRef<number>(0);
  const lockedWarningTimerRef = useRef<number>(0);

  // Synchronous Direction and Door references for frame-accurate 60fps loop
  const directionsRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const exitDoorRef = useRef<ExitDoor>({ ...currentConfig.exitDoor });

  // Load a specified level and difficulty
  const loadLevel = useCallback(
    (levelNum: 1 | 2 | 3, diff: Difficulty, autoPlay = true) => {
      const config = LEVELS[levelNum];
      const diffCfg = DIFFICULTY_CONFIGS[diff];

      // Reset movement directions
      const initialDirs = { up: false, down: false, left: false, right: false };
      directionsRef.current = initialDirs;
      setActiveDirections(initialDirs);

      setCurrentLevel(levelNum);
      setPlayer({
        x: config.playerStart.x,
        y: config.playerStart.y,
        radius: 12,
        speed: 3.2,
        angle: 0,
        hasKey: false,
        hasCard: false,
        hasIntel: false,
        isMoving: false,
        footstepTimer: 0,
      });

      setGuards(config.getGuards(diff));
      setWalls([...config.walls]);
      setItems(JSON.parse(JSON.stringify(config.items)));
      setObjectives(config.getInitialObjectives());

      const initialDoor = { ...config.exitDoor };
      exitDoorRef.current = initialDoor;
      setExitDoor(initialDoor);

      setParticles([]);
      setNotifications([]);
      setTimeRemaining(diffCfg.timeLimit);
      setDetection(0);
      setMaxDetectionEver(0);
      setGameStatus(autoPlay ? 'playing' : 'idle');
      lastTimeRef.current = performance.now();
    },
    []
  );

  // Mobile Touch direction change handler
  const handleMobileDirectionChange = useCallback((dir: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
    directionsRef.current = dir;
    setActiveDirections(dir);
  }, []);

  // Restart current level
  const handleRestart = useCallback(() => {
    soundEngine.playClick();
    loadLevel(currentLevel, difficulty, true);
  }, [currentLevel, difficulty, loadLevel]);

  // Next level handler
  const handleNextLevel = useCallback(() => {
    soundEngine.playClick();
    if (currentLevel < 3) {
      const nextLvl = (currentLevel + 1) as 1 | 2 | 3;
      loadLevel(nextLvl, difficulty, true);
      addNotification(
        `LEVEL ${nextLvl} STARTED`,
        LEVELS[nextLvl].titleTh,
        'unlocked'
      );
    }
  }, [currentLevel, difficulty, loadLevel, addNotification]);

  // Restart all from Level 1 / change difficulty
  const handleRestartAll = useCallback(() => {
    soundEngine.playClick();
    setLevelScores([]);
    loadLevel(1, difficulty, false);
  }, [difficulty, loadLevel]);

  const handleStartGame = () => {
    soundEngine.playClick();
    loadLevel(1, difficulty, true);
    addNotification('OPERATION STARTED', 'ภารกิจเริ่มต้น // ขอให้โชคดี', 'unlocked');
  };

  const handleSelectDifficulty = (diff: Difficulty) => {
    soundEngine.playClick();
    setDifficulty(diff);
    if (gameStatus === 'idle') {
      setTimeRemaining(DIFFICULTY_CONFIGS[diff].timeLimit);
      setGuards(LEVELS[currentLevel].getGuards(diff));
    }
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Keyboard controls listener (W, A, S, D and Arrow keys, multi-layout supported)
  useEffect(() => {
    const isUp = (e: KeyboardEvent) =>
      e.code === 'KeyW' ||
      e.code === 'ArrowUp' ||
      ['w', 'arrowup', 'up', 'ไ', 'ำ'].includes(e.key.toLowerCase());

    const isDown = (e: KeyboardEvent) =>
      e.code === 'KeyS' ||
      e.code === 'ArrowDown' ||
      ['s', 'arrowdown', 'down', 'ห', 'ฆ'].includes(e.key.toLowerCase());

    const isLeft = (e: KeyboardEvent) =>
      e.code === 'KeyA' ||
      e.code === 'ArrowLeft' ||
      ['a', 'arrowleft', 'left', 'ฟ', 'ฤ'].includes(e.key.toLowerCase());

    const isRight = (e: KeyboardEvent) =>
      e.code === 'KeyD' ||
      e.code === 'ArrowRight' ||
      ['d', 'arrowright', 'right', 'ก', 'ฎ'].includes(e.key.toLowerCase());

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an editable input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      let matched = false;
      const next = { ...directionsRef.current };

      if (isUp(e)) {
        next.up = true;
        matched = true;
      }
      if (isDown(e)) {
        next.down = true;
        matched = true;
      }
      if (isLeft(e)) {
        next.left = true;
        matched = true;
      }
      if (isRight(e)) {
        next.right = true;
        matched = true;
      }

      if (matched) {
        e.preventDefault();
        directionsRef.current = next;
        setActiveDirections(next);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let matched = false;
      const next = { ...directionsRef.current };

      if (isUp(e)) {
        next.up = false;
        matched = true;
      }
      if (isDown(e)) {
        next.down = false;
        matched = true;
      }
      if (isLeft(e)) {
        next.left = false;
        matched = true;
      }
      if (isRight(e)) {
        next.right = false;
        matched = true;
      }

      if (matched) {
        directionsRef.current = next;
        setActiveDirections(next);
      }
    };

    const handleWindowBlur = () => {
      const reset = { up: false, down: false, left: false, right: false };
      directionsRef.current = reset;
      setActiveDirections(reset);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleWindowBlur);
    };
  }, []);

  // Main Game Loop
  useEffect(() => {
    if (gameStatus !== 'playing') {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      return;
    }

    const gameLoop = (currentTime: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = currentTime;
      }
      const dt = Math.min(0.08, (currentTime - lastTimeRef.current) / 1000);
      lastTimeRef.current = currentTime;

      const currentExit = exitDoorRef.current;

      // 1. Update Timer
      setTimeRemaining((prevTime) => {
        const nextTime = Math.max(0, prevTime - dt);
        if (nextTime <= 0) {
          soundEngine.playGameOver();
          setGameStatus('gameover_time');
        }
        return nextTime;
      });

      // 2. Active Collision Walls (Include locked Exit door as solid barrier until unlocked)
      const currentCollisionWalls = currentExit.unlocked
        ? walls
        : [
            ...walls,
            {
              id: 'exit-door-barrier',
              x: currentExit.x,
              y: currentExit.y,
              width: currentExit.width,
              height: currentExit.height,
              type: 'wall' as const,
            },
          ];

      // 3. Update Player Position & Direction
      const dirs = directionsRef.current;
      setPlayer((prevPlayer) => {
        let vx = 0;
        let vy = 0;

        if (dirs.up) vy -= 1;
        if (dirs.down) vy += 1;
        if (dirs.left) vx -= 1;
        if (dirs.right) vx += 1;

        const isMoving = vx !== 0 || vy !== 0;
        let newAngle = prevPlayer.angle;

        if (isMoving) {
          // Normalize diagonal vector
          const len = Math.hypot(vx, vy);
          vx = (vx / len) * prevPlayer.speed * 60 * dt;
          vy = (vy / len) * prevPlayer.speed * 60 * dt;
          newAngle = Math.atan2(vy, vx);

          // Footstep audio
          footstepSoundTimerRef.current += dt;
          if (footstepSoundTimerRef.current > 0.28) {
            footstepSoundTimerRef.current = 0;
            soundEngine.playFootstep();
          }
        }

        // Apply movement & resolve wall collisions strictly
        const rawX = prevPlayer.x + vx;
        const rawY = prevPlayer.y + vy;
        const resolved = resolveCircleWallCollision(rawX, rawY, prevPlayer.radius, currentCollisionWalls);

        // Keep inside boundary margins
        const clampedX = Math.max(25, Math.min(MAP_WIDTH - 25, resolved.x));
        const clampedY = Math.max(25, Math.min(MAP_HEIGHT - 25, resolved.y));

        // Check if player approached locked exit door to give helpful cue
        if (!currentExit.unlocked) {
          const distToExit = Math.hypot(
            clampedX - (currentExit.x + currentExit.width / 2),
            clampedY - (currentExit.y + currentExit.height / 2)
          );
          if (distToExit < 75) {
            lockedWarningTimerRef.current += dt;
            if (lockedWarningTimerRef.current > 3.0) {
              lockedWarningTimerRef.current = 0;
              soundEngine.playLockedDoorWarning();
              addNotification('EXIT LOCKED', 'ทำเป้าหมายภารกิจทั้งหมดเพื่อปลดล็อกทางออก', 'locked');
            }
          }
        }

        return {
          ...prevPlayer,
          x: clampedX,
          y: clampedY,
          angle: newAngle,
          isMoving,
        };
      });

      // 4. Update Guards AI and Movement
      setGuards((prevGuards) => {
        return prevGuards.map((guard) => {
          const updated = { ...guard };
          updateGuard(updated, dt);
          return updated;
        });
      });

      // 5. Calculate Guard Detection vs Player
      setDetection((prevDetection) => {
        let maxDetectedIntensity = 0;

        guards.forEach((guard) => {
          const { isDetected, intensity } = checkGuardDetection(guard, player, walls);
          if (isDetected && intensity > maxDetectedIntensity) {
            maxDetectedIntensity = intensity;
            guard.state = intensity > 0.7 ? 'alert' : 'suspicious';
          } else if (!isDetected && guard.state !== 'patrol') {
            guard.state = 'patrol';
          }
        });

        let nextDetection = prevDetection;
        const diffMultiplier = diffConfig.alertSpeedMultiplier;

        if (maxDetectedIntensity > 0) {
          // Increase detection rapidly scaled by difficulty
          const increaseRate = (42 + maxDetectedIntensity * 55) * diffMultiplier;
          nextDetection = Math.min(100, prevDetection + increaseRate * dt);

          // Audio warning sound pulse
          detectionSoundTimerRef.current += dt;
          const interval = Math.max(0.12, 0.4 - (nextDetection / 100) * 0.28);
          if (detectionSoundTimerRef.current >= interval) {
            detectionSoundTimerRef.current = 0;
            soundEngine.playDetectionWarning(nextDetection / 100);
          }
        } else {
          // Gradual cooldown when hidden in shadows
          nextDetection = Math.max(0, prevDetection - 18 * dt);
        }

        // Track max detection for stealth rating bonus
        setMaxDetectionEver((prevMax) => Math.max(prevMax, nextDetection));

        // Game Over if detection reaches 100%
        if (nextDetection >= 100) {
          soundEngine.playGameOver();
          setGameStatus('gameover_detected');
        }

        return nextDetection;
      });

      // 6. Check Interactive Item Triggers (Key, Access Card, Intel, Terminals)
      setItems((prevItems) => {
        let itemUpdated = false;
        const newItems = prevItems.map((item) => {
          if (item.collected) return item;

          const dist = Math.hypot(player.x - item.x, player.y - item.y);
          const reachDist = player.radius + item.radius + 6;

          if (dist <= reachDist) {
            itemUpdated = true;

            if (item.type === 'key') {
              soundEngine.playKeyPickup();
              setPlayer((p) => ({ ...p, hasKey: true }));
              addNotification('KEY ACQUIRED', 'Security Key ได้รับแล้ว!', 'key');
              setParticles((parts) => [
                ...parts,
                ...createSparks(item.x, item.y, '#f59e0b', 24),
                ...createSparks(item.x, item.y, '#fef08a', 16),
              ]);
            } else if (item.type === 'master_key') {
              soundEngine.playKeyPickup();
              setPlayer((p) => ({ ...p, hasKey: true }));
              addNotification('MASTER KEY ACQUIRED', 'Master Key ได้รับแล้ว!', 'key');
              setParticles((parts) => [
                ...parts,
                ...createSparks(item.x, item.y, '#facc15', 28),
                ...createSparks(item.x, item.y, '#fef08a', 20),
              ]);
            } else if (item.type === 'access_card') {
              soundEngine.playCardPickup();
              setPlayer((p) => ({ ...p, hasCard: true }));
              addNotification('ACCESS CARD ACQUIRED', 'Security Keycard ได้รับแล้ว!', 'card');
              setParticles((parts) => [
                ...parts,
                ...createSparks(item.x, item.y, '#06b6d4', 24),
                ...createSparks(item.x, item.y, '#67e8f9', 16),
              ]);
            } else if (item.type === 'intel') {
              soundEngine.playIntelPickup();
              setPlayer((p) => ({ ...p, hasIntel: true }));
              addNotification('CLASSIFIED INTEL', 'ดาวน์โหลดข้อมูลลับสำเร็จ!', 'intel');
              setParticles((parts) => [
                ...parts,
                ...createSparks(item.x, item.y, '#d946ef', 26),
                ...createSparks(item.x, item.y, '#fae8ff', 18),
              ]);
            } else if (item.type === 'terminal') {
              soundEngine.playTerminalHack();
              addNotification('TERMINAL OVERRIDDEN', `${item.label} แฮกสำเร็จ!`, 'terminal');
              setParticles((parts) => [
                ...parts,
                ...createSparks(item.x, item.y, '#10b981', 25),
                ...createSparks(item.x, item.y, '#38bdf8', 18),
              ]);
            }

            // Mark matching objective as completed & unlock Exit Door when all ready
            setObjectives((prevObjs) => {
              const nextObjs = prevObjs.map((obj) => {
                const isMatch =
                  obj.targetItemId === item.id ||
                  (obj.type === 'key' && (item.type === 'key' || item.type === 'master_key')) ||
                  (obj.type === 'card' && item.type === 'access_card') ||
                  (obj.type === 'intel' && item.type === 'intel') ||
                  (obj.type === 'terminal' && (obj.targetItemId === item.id || obj.id.includes(item.id.replace('l2-', '').replace('l3-', ''))));

                if (isMatch) {
                  return { ...obj, completed: true };
                }
                return obj;
              });

              // Check if all non-exit objectives are complete -> Unlock Exit Door!
              const nonExitAllDone = nextObjs
                .filter((o) => o.type !== 'exit')
                .every((o) => o.completed);

              if (nonExitAllDone) {
                exitDoorRef.current = { ...exitDoorRef.current, unlocked: true };
                setExitDoor((d) => ({ ...d, unlocked: true }));
                soundEngine.playDoorUnlocked();
                setTimeout(() => {
                  addNotification('EXIT UNLOCKED', 'ประตูทางออกเปิดแล้ว // รีบไปยังจุดถอนตัว', 'unlocked');
                }, 400);
              }

              return nextObjs;
            });

            return { ...item, collected: true };
          }
          return item;
        });

        return itemUpdated ? newItems : prevItems;
      });

      // 7. Check Exit Door Escape (Level Victory / Campaign Victory)
      if (currentExit.unlocked) {
        const inExitX = player.x >= currentExit.x - 8 && player.x <= currentExit.x + currentExit.width + 8;
        const inExitY = player.y >= currentExit.y - 8 && player.y <= currentExit.y + currentExit.height + 8;

        if (inExitX && inExitY) {
          // Mark exit objective as completed
          setObjectives((prev) => prev.map((o) => (o.type === 'exit' ? { ...o, completed: true } : o)));

          // Calculate Level Score
          const lvlTimeBonus = Math.floor(timeRemaining * 50);
          const lvlStealthBonus =
            maxDetectionEver < 20 ? 3000 : maxDetectionEver < 50 ? 1800 : maxDetectionEver < 80 ? 1000 : 400;
          const objBonus = 1500;
          const rawLvlScore = Math.floor((lvlTimeBonus + lvlStealthBonus + objBonus) * diffConfig.scoreMultiplier);

          setLevelScores((prevScores) => [...prevScores.slice(0, currentLevel - 1), rawLvlScore]);

          setParticles((parts) => [
            ...parts,
            ...createSparks(player.x, player.y, '#10b981', 35),
            ...createSparks(player.x, player.y, '#34d399', 25),
            ...createSparks(player.x, player.y, '#fef08a', 20),
          ]);

          if (currentLevel < 3) {
            // Level 1 or 2 Completed!
            soundEngine.playVictory();
            setGameStatus('victory');
          } else {
            // Level 3 (Final Level) Completed -> OPERATION COMPLETE!
            soundEngine.playOperationComplete();
            setGameStatus('operation_complete');
          }
        }
      }

      // 8. Update Particles
      setParticles((prevParts) => updateParticles(prevParts, dt));

      requestRef.current = requestAnimationFrame(gameLoop);
    };

    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [
    gameStatus,
    player,
    guards,
    walls,
    timeRemaining,
    maxDetectionEver,
    currentLevel,
    diffConfig,
    addNotification,
  ]);

  // Compute current Level Stats & Overall Campaign Score
  const currentTimeBonus = Math.floor(timeRemaining * 50);
  const currentStealthBonus =
    maxDetectionEver < 20 ? 3000 : maxDetectionEver < 50 ? 1800 : maxDetectionEver < 80 ? 1000 : 400;
  const currentLevelScore = Math.floor((currentTimeBonus + currentStealthBonus + 1500) * diffConfig.scoreMultiplier);

  const cumulativeTotalScore =
    levelScores.reduce((acc, score) => acc + score, 0) +
    (gameStatus === 'playing' || gameStatus === 'idle' ? 0 : 0);

  const getRank = (): 'S' | 'A' | 'B' | 'C' | 'F' => {
    if (gameStatus !== 'victory' && gameStatus !== 'operation_complete') return 'F';
    if (maxDetectionEver < 25 && timeRemaining > diffConfig.timeLimit * 0.45) return 'S';
    if (maxDetectionEver < 55) return 'A';
    if (maxDetectionEver < 85) return 'B';
    return 'C';
  };

  const gameStats: GameStats = {
    currentLevel,
    difficulty,
    timeRemaining,
    maxTime: diffConfig.timeLimit,
    detection,
    score: currentLevelScore,
    totalScore: cumulativeTotalScore || currentLevelScore,
    levelScores,
    hasKey: player.hasKey,
    hasCard: player.hasCard,
    hasIntel: player.hasIntel,
    status: gameStatus,
    stealthBonus: currentStealthBonus,
    timeBonus: currentTimeBonus,
    rank: getRank(),
    objectives,
  };

  const allObjectivesCompleted = objectives.every((o) => o.completed);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none">
      {/* Top Tactical HUD Header */}
      <GameHeader
        stats={gameStats}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onRestart={handleRestart}
        onOpenHelp={() => setIsHelpOpen(true)}
        onSelectDifficulty={handleSelectDifficulty}
      />

      {/* Main Play Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 max-w-6xl mx-auto w-full gap-2.5">
        {/* Active Mission Checklist HUD */}
        {gameStatus !== 'idle' && (
          <MissionChecklist
            levelConfig={currentConfig}
            objectives={objectives}
            difficulty={difficulty}
            allCompleted={allObjectivesCompleted}
          />
        )}

        {/* Game Canvas Viewport */}
        <div className="w-full relative">
          {/* Toast Notification HUD */}
          <GameToast notifications={notifications} />

          <GameCanvas
            player={player}
            guards={guards}
            walls={walls}
            items={items}
            exitDoor={exitDoor}
            particles={particles}
            detectionLevel={detection}
            gameStatus={gameStatus}
            decorations={currentConfig.decorations}
          />

          {/* Idle Start Briefing / Difficulty Selector Overlay */}
          {gameStatus === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md rounded-xl p-4 sm:p-6 text-center z-10 overflow-y-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 text-xs font-mono mb-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>TACTICAL STEALTH INFILTRATION // 3 MISSIONS</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black font-mono tracking-wider text-slate-100 uppercase mb-1 drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                SHADOW ESCAPE
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mb-4 leading-relaxed font-sans">
                ภารกิจสายลับ 3 ด่าน: ขโมยคีย์การ์ด แฮก Terminal และเจาะข้อมูลลับออกจากอาคาร โดยหลบสายตายามให้ได้
              </p>

              {/* Difficulty Selection Card Row */}
              <div className="w-full max-w-xl mb-5">
                <DifficultySelector
                  selectedDifficulty={difficulty}
                  onSelectDifficulty={handleSelectDifficulty}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  id="btn-start-game"
                  onClick={handleStartGame}
                  className="px-8 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-base tracking-wider uppercase shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2.5 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>START OPERATION (เริ่มภารกิจ)</span>
                </button>

                <button
                  id="btn-open-instructions"
                  onClick={() => setIsHelpOpen(true)}
                  className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-sm tracking-wider uppercase border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>คู่มือ (HOW TO PLAY)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Level Summary Quick Bar */}
        <section
          id="how-to-play-summary"
          className="w-full p-2.5 sm:p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-md flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold text-cyan-400 uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 shrink-0">
              TACTICAL INTEL
            </span>
            <p className="text-slate-300 text-xs">
              <strong>ด่าน {currentLevel}:</strong> {currentConfig.titleTh} — {currentConfig.descriptionTh}
            </p>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> WASD / Touch เพื่อเดิน
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> ทำ Checklist
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> หนีออก Exit Door
            </span>
          </div>
        </section>

        {/* Mobile Touch Controller (Visible only on touch/mobile screens) */}
        {gameStatus === 'playing' && (
          <div className="w-full mt-1 md:hidden">
            <MobileControls
              onDirectionChange={handleMobileDirectionChange}
              activeDirections={activeDirections}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <HowToPlayModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onStartGame={handleStartGame}
        isGameStarted={gameStatus === 'playing'}
      />

      <GameOverModal
        stats={gameStats}
        onRestart={handleRestart}
        onNextLevel={handleNextLevel}
        onRestartAll={handleRestartAll}
      />
    </div>
  );
}
