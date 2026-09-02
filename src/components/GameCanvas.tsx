import React, { useRef, useEffect } from 'react';
import { Player, Guard, Wall, InteractiveItem, ExitDoor, Particle, GameStatus } from '../types';
import { MAP_WIDTH, MAP_HEIGHT } from '../utils/gameData';
import { calculateVisionPolygon } from '../utils/gameLogic';

interface GameCanvasProps {
  player: Player;
  guards: Guard[];
  walls: Wall[];
  items: InteractiveItem[];
  exitDoor: ExitDoor;
  particles: Particle[];
  detectionLevel: number;
  gameStatus: GameStatus;
  decorations?: { text: string; x: number; y: number }[];
  onCanvasClick?: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  player,
  guards,
  walls,
  items,
  exitDoor,
  particles,
  detectionLevel,
  gameStatus,
  decorations,
  onCanvasClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // 1. Draw subtle tactical grid lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= MAP_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= MAP_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_WIDTH, y);
      ctx.stroke();
    }

    // Zone ambient floor marks & decorations
    ctx.save();
    ctx.font = '700 11px Rajdhani, monospace';
    ctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
    if (decorations && decorations.length > 0) {
      decorations.forEach((dec) => {
        ctx.fillText(dec.text, dec.x, dec.y);
      });
    }
    ctx.restore();

    // 2. Draw Exit Door & Extraction Beacon
    ctx.save();
    const isUnlocked = exitDoor.unlocked;
    const nowTime = Date.now() / 1000;
    const doorCenter = {
      x: exitDoor.x + exitDoor.width / 2,
      y: exitDoor.y + exitDoor.height / 2,
    };

    if (isUnlocked) {
      // Pulsing extraction radio rings
      const beaconPulse = (Math.sin(nowTime * 5) + 1) / 2;
      const ringRadius = Math.max(exitDoor.width, exitDoor.height) * 0.75 + beaconPulse * 14;
      ctx.beginPath();
      ctx.arc(doorCenter.x, doorCenter.y, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(16, 185, 129, ${0.4 - beaconPulse * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 18;
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 6;
    }
    ctx.fillRect(exitDoor.x, exitDoor.y, exitDoor.width, exitDoor.height);

    // Door Frame
    ctx.lineWidth = 2;
    ctx.strokeStyle = isUnlocked ? '#10b981' : '#ef4444';
    ctx.strokeRect(exitDoor.x, exitDoor.y, exitDoor.width, exitDoor.height);

    // Hazard stripes at door threshold
    ctx.fillStyle = isUnlocked ? 'rgba(52, 211, 153, 0.45)' : 'rgba(239, 68, 68, 0.3)';
    for (let i = 0; i < exitDoor.width; i += 12) {
      ctx.beginPath();
      ctx.moveTo(exitDoor.x + i, exitDoor.y);
      ctx.lineTo(exitDoor.x + i + 6, exitDoor.y);
      ctx.lineTo(exitDoor.x + i, exitDoor.y + 8);
      ctx.fill();
    }

    // Door Label & Icon
    ctx.shadowBlur = 0;
    ctx.font = 'bold 12px Rajdhani, monospace';
    ctx.fillStyle = isUnlocked ? '#34d399' : '#f87171';
    ctx.textAlign = 'center';
    ctx.fillText(
      isUnlocked ? '🔓 OPEN (ESCAPE)' : '🔒 LOCKED',
      doorCenter.x,
      doorCenter.y + 4
    );
    ctx.font = '700 9px monospace';
    ctx.fillStyle = isUnlocked ? '#a7f3d0' : '#fca5a5';
    ctx.fillText(
      exitDoor.label || 'EXIT AIRLOCK',
      doorCenter.x,
      doorCenter.y + 18
    );
    ctx.restore();

    // 3. Draw Interactive Mission Items (Keys, Access Cards, Intel Disks, Terminals)
    const now = Date.now() / 1000;
    items.forEach((item) => {
      if (item.collected && item.type !== 'terminal') return;

      ctx.save();
      const pulse = Math.sin(now * 4 + item.x) * 3;

      if (item.type === 'key' || item.type === 'master_key') {
        const isMaster = item.type === 'master_key';
        // Outer ripple
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius + 10 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = isMaster ? 'rgba(234, 179, 8, 0.16)' : 'rgba(245, 158, 11, 0.12)';
        ctx.fill();

        // Glow core
        ctx.shadowColor = isMaster ? '#facc15' : '#fbbf24';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fillStyle = isMaster ? '#eab308' : '#f59e0b';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fef08a';
        ctx.stroke();

        // Key icon
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(item.x - 2, item.y - 1, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(item.x, item.y - 2, 6, 2);
        ctx.fillRect(item.x + 3, item.y, 2, 3);
        ctx.fillRect(item.x + 5, item.y, 2, 2);

        // Floating label
        ctx.font = '700 10px Rajdhani, monospace';
        ctx.fillStyle = isMaster ? '#fef08a' : '#fde047';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, item.x, item.y - 16);
      } else if (item.type === 'access_card') {
        // Cyan Keycard
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius + 8 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.fill();

        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#0891b2';
        ctx.fillRect(item.x - 10, item.y - 7, 20, 14);
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(item.x - 10, item.y - 7, 20, 14);

        // Chip stripe
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(item.x - 6, item.y - 3, 5, 6);
        ctx.fillStyle = '#0e7490';
        ctx.fillRect(item.x + 1, item.y - 3, 7, 2);

        ctx.shadowBlur = 0;
        ctx.font = '700 10px Rajdhani, monospace';
        ctx.fillStyle = '#67e8f9';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, item.x, item.y - 14);
      } else if (item.type === 'intel') {
        // Fuchsia / Purple Classified Intel Disk
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius + 10 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(217, 70, 239, 0.16)';
        ctx.fill();

        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#a21caf';
        ctx.fill();
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner data chip pattern
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fae8ff';
        ctx.fillRect(item.x - 4, item.y - 4, 8, 8);
        ctx.fillStyle = '#701a75';
        ctx.fillRect(item.x - 2, item.y - 2, 4, 4);

        ctx.font = '700 10px Rajdhani, monospace';
        ctx.fillStyle = '#f0abfc';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, item.x, item.y - 16);
      } else if (item.type === 'terminal') {
        // Cybernetic Hack Terminal Node
        const isHacked = item.collected;
        const termColor = isHacked ? '#10b981' : '#06b6d4';
        const glowColor = isHacked ? 'rgba(16, 185, 129, 0.4)' : 'rgba(6, 182, 212, 0.4)';

        ctx.shadowColor = termColor;
        ctx.shadowBlur = isHacked ? 10 : 16;
        ctx.fillStyle = isHacked ? '#064e3b' : '#083344';
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = termColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Terminal screen inside
        ctx.shadowBlur = 0;
        ctx.fillStyle = isHacked ? '#34d399' : '#38bdf8';
        ctx.fillRect(item.x - 6, item.y - 6, 12, 12);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isHacked ? '✓' : '⚡', item.x, item.y + 3);

        // Terminal pulse radar ring if active
        if (!isHacked) {
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.radius + 6 + pulse, 0, Math.PI * 2);
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.font = '700 9px Rajdhani, monospace';
        ctx.fillStyle = isHacked ? '#6ee7b7' : '#7dd3fc';
        ctx.fillText(isHacked ? 'OVERRIDDEN' : item.label, item.x, item.y - 20);
      }

      ctx.restore();
    });

    // 4. Draw Walls & Obstacles
    walls.forEach((wall) => {
      ctx.save();
      if (wall.type === 'server') {
        // Server rack styling
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);

        // Blinking rack LED lights
        const time = Date.now() / 300;
        const ledOn = Math.sin(time + wall.x) > 0;
        ctx.fillStyle = ledOn ? '#06b6d4' : '#0284c7';
        ctx.fillRect(wall.x + 4, wall.y + 4, 3, 3);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(wall.x + 10, wall.y + 4, 3, 3);
      } else if (wall.type === 'crate') {
        // Wooden/Steel Crate
        ctx.fillStyle = '#334155';
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);

        // Cross bracing
        ctx.beginPath();
        ctx.moveTo(wall.x, wall.y);
        ctx.lineTo(wall.x + wall.width, wall.y + wall.height);
        ctx.moveTo(wall.x + wall.width, wall.y);
        ctx.lineTo(wall.x, wall.y + wall.height);
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
        ctx.stroke();
      } else if (wall.type === 'pillar') {
        // Concrete Column
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      } else {
        // Standard high-tech barrier wall
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(wall.x + 1, wall.y + 1, wall.width - 2, wall.height - 2);
      }

      if (wall.label) {
        ctx.font = '600 9px Rajdhani, monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(wall.label, wall.x + wall.width / 2, wall.y + wall.height / 2 + 3);
      }
      ctx.restore();
    });

    // 5. Draw Guards and their Flashlight Vision Cones
    guards.forEach((guard) => {
      const visionPoly = calculateVisionPolygon(guard, walls, 32);

      ctx.save();
      // Vision Cone Fill with gradient
      if (visionPoly.length > 2) {
        ctx.beginPath();
        ctx.moveTo(visionPoly[0].x, visionPoly[0].y);
        for (let i = 1; i < visionPoly.length; i++) {
          ctx.lineTo(visionPoly[i].x, visionPoly[i].y);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(
          guard.x,
          guard.y,
          5,
          guard.x,
          guard.y,
          guard.visionRange
        );

        if (guard.state === 'alert' || detectionLevel >= 70) {
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.65)');
          grad.addColorStop(0.6, 'rgba(244, 63, 94, 0.35)');
          grad.addColorStop(1, 'rgba(225, 29, 72, 0.02)');
          ctx.fillStyle = grad;
        } else if (guard.state === 'suspicious' || detectionLevel >= 35) {
          grad.addColorStop(0, 'rgba(245, 158, 11, 0.55)');
          grad.addColorStop(0.6, 'rgba(251, 191, 36, 0.25)');
          grad.addColorStop(1, 'rgba(217, 119, 6, 0.02)');
          ctx.fillStyle = grad;
        } else {
          grad.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
          grad.addColorStop(0.6, 'rgba(234, 179, 8, 0.18)');
          grad.addColorStop(1, 'rgba(202, 138, 4, 0.01)');
          ctx.fillStyle = grad;
        }

        ctx.fill();

        ctx.strokeStyle = guard.state === 'alert' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(234, 179, 8, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Close detection ring
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, guard.closeDetectionRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Guard Body
      ctx.shadowColor = guard.state === 'alert' ? '#ef4444' : '#eab308';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
      ctx.fillStyle = guard.state === 'alert' ? '#991b1b' : '#854d0e';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = guard.state === 'alert' ? '#f87171' : '#fef08a';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Guard Facing Direction Indicator
      const dirX = guard.x + Math.cos(guard.angle) * (guard.radius + 4);
      const dirY = guard.y + Math.sin(guard.angle) * (guard.radius + 4);
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(dirX, dirY);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Alert Badge
      if (guard.state === 'alert' || detectionLevel >= 70) {
        ctx.font = 'bold 14px Rajdhani, monospace';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText('!', guard.x, guard.y - guard.radius - 8);
      } else if (guard.state === 'suspicious' || detectionLevel >= 35) {
        ctx.font = 'bold 12px Rajdhani, monospace';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.fillText('?', guard.x, guard.y - guard.radius - 8);
      }

      ctx.restore();
    });

    // 6. Draw Player (Infiltrator)
    ctx.save();
    const pTime = Date.now() / 400;
    const playerGlow = Math.sin(pTime) * 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 4 + playerGlow, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.fill();

    // Player Body
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#083344';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#22d3ee';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Player directional visor
    const pDirX = player.x + Math.cos(player.angle) * (player.radius + 2);
    const pDirY = player.y + Math.sin(player.angle) * (player.radius + 2);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(pDirX, pDirY);
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Small Inventory icons attached to player
    let iconOffsetX = 8;
    if (player.hasKey) {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(player.x + iconOffsetX, player.y - 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
      iconOffsetX += 8;
    }
    if (player.hasCard) {
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 6;
      ctx.fillRect(player.x + iconOffsetX - 3, player.y - 11, 7, 5);
      iconOffsetX += 8;
    }
    if (player.hasIntel) {
      ctx.fillStyle = '#d946ef';
      ctx.shadowColor = '#f0abfc';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(player.x + iconOffsetX, player.y - 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Player Identification Tag
    ctx.font = '700 9px Rajdhani, monospace';
    ctx.fillStyle = '#67e8f9';
    ctx.textAlign = 'center';
    ctx.fillText('INFILTRATOR', player.x, player.y + player.radius + 12);
    ctx.restore();

    // 7. Draw Particles
    particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    });

    // 8. Draw Alert Red Flash Vignette
    if (detectionLevel >= 70) {
      ctx.save();
      const alpha = ((detectionLevel - 70) / 30) * 0.35 * (0.8 + Math.sin(Date.now() / 150) * 0.2);
      ctx.fillStyle = `rgba(225, 29, 72, ${alpha})`;
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      ctx.restore();
    }

    // 9. Initial Start Overlay
    if (gameStatus === 'idle') {
      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      ctx.font = '700 24px Rajdhani, monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('SHADOW ESCAPE - TACTICAL BRIEFING', MAP_WIDTH / 2, MAP_HEIGHT / 2 - 25);
      ctx.font = '600 14px Chakra Petch, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('เลือกระดับความยาก (Difficulty) แล้วกด START GAME เพื่อเริ่มภารกิจ', MAP_WIDTH / 2, MAP_HEIGHT / 2 + 10);
      ctx.font = '500 12px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText('3 MISSIONS // SECTOR 1 -> SECTOR 2 -> SECTOR 3', MAP_WIDTH / 2, MAP_HEIGHT / 2 + 35);
      ctx.restore();
    }
  }, [player, guards, walls, items, exitDoor, particles, detectionLevel, gameStatus, decorations]);

  return (
    <div
      id="game-canvas-container"
      className="relative w-full max-w-5xl mx-auto rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 aspect-[960/600] flex items-center justify-center cursor-crosshair"
      onClick={onCanvasClick}
    >
      <canvas
        ref={canvasRef}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className="w-full h-full object-contain block"
      />
      {/* Scanline CRT tech overlay */}
      <div className="absolute inset-0 pointer-events-none scanline-overlay opacity-35" />
    </div>
  );
};
