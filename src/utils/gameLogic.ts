import { Wall, Guard, Player, Particle, Position } from '../types';

// Check intersection between two line segments (p1-p2 and p3-p4)
export function lineIntersect(
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  x4: number, y4: number
): { x: number; y: number; t: number } | null {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 0.0001) return null;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: x1 + ua * (x2 - x1),
      y: y1 + ua * (y2 - y1),
      t: ua,
    };
  }
  return null;
}

// Raycast from a point in a given angle with max distance against all walls
export function castRay(
  startX: number,
  startY: number,
  angle: number,
  maxDist: number,
  walls: Wall[]
): { x: number; y: number; dist: number } {
  const targetX = startX + Math.cos(angle) * maxDist;
  const targetY = startY + Math.sin(angle) * maxDist;

  let closestHit: { x: number; y: number; dist: number } = {
    x: targetX,
    y: targetY,
    dist: maxDist,
  };

  for (const wall of walls) {
    const rx = wall.x;
    const ry = wall.y;
    const rw = wall.width;
    const rh = wall.height;

    // 4 edges of wall box
    const edges = [
      { x1: rx, y1: ry, x2: rx + rw, y2: ry }, // top
      { x1: rx + rw, y1: ry, x2: rx + rw, y2: ry + rh }, // right
      { x1: rx + rw, y1: ry + rh, x2: rx, y2: ry + rh }, // bottom
      { x1: rx, y1: ry + rh, x2: rx, y2: ry }, // left
    ];

    for (const edge of edges) {
      const hit = lineIntersect(startX, startY, targetX, targetY, edge.x1, edge.y1, edge.x2, edge.y2);
      if (hit) {
        const d = Math.hypot(hit.x - startX, hit.y - startY);
        if (d < closestHit.dist) {
          closestHit = {
            x: hit.x,
            y: hit.y,
            dist: d,
          };
        }
      }
    }
  }

  return closestHit;
}

// Check if line of sight between two points is blocked by any wall
export function isLineOfSightBlocked(
  x1: number, y1: number,
  x2: number, y2: number,
  walls: Wall[]
): boolean {
  for (const wall of walls) {
    const rx = wall.x;
    const ry = wall.y;
    const rw = wall.width;
    const rh = wall.height;

    // Check if line from (x1, y1) to (x2, y2) crosses any wall boundary
    const edges = [
      { x1: rx, y1: ry, x2: rx + rw, y2: ry },
      { x1: rx + rw, y1: ry, x2: rx + rw, y2: ry + rh },
      { x1: rx + rw, y1: ry + rh, x2: rx, y2: ry + rh },
      { x1: rx, y1: ry + rh, x2: rx, y2: ry },
    ];

    for (const edge of edges) {
      if (lineIntersect(x1, y1, x2, y2, edge.x1, edge.y1, edge.x2, edge.y2)) {
        return true;
      }
    }
  }
  return false;
}

// Normalize angle to [-PI, PI]
export function normalizeAngle(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Smoothly interpolate angle
export function rotateTowards(current: number, target: number, maxStep: number): number {
  const diff = normalizeAngle(target - current);
  if (Math.abs(diff) <= maxStep) return target;
  return normalizeAngle(current + Math.sign(diff) * maxStep);
}

// Check if guard detects player
export function checkGuardDetection(
  guard: Guard,
  player: Player,
  walls: Wall[]
): { isDetected: boolean; intensity: number } {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);

  // 1. Close proximity hearing / touch detection
  if (dist <= guard.closeDetectionRadius) {
    if (!isLineOfSightBlocked(guard.x, guard.y, player.x, player.y, walls)) {
      return { isDetected: true, intensity: 1.0 };
    }
  }

  // 2. Vision cone detection
  if (dist <= guard.visionRange) {
    const angleToPlayer = Math.atan2(dy, dx);
    const angleDiff = Math.abs(normalizeAngle(angleToPlayer - guard.angle));

    if (angleDiff <= guard.fov / 2) {
      // Check center of player and 2 tangential side points for accurate sight
      const isBlockedCenter = isLineOfSightBlocked(guard.x, guard.y, player.x, player.y, walls);
      
      const perpAngle = angleToPlayer + Math.PI / 2;
      const offsetRadius = player.radius * 0.7;
      const pLeftX = player.x + Math.cos(perpAngle) * offsetRadius;
      const pLeftY = player.y + Math.sin(perpAngle) * offsetRadius;
      const pRightX = player.x - Math.cos(perpAngle) * offsetRadius;
      const pRightY = player.y - Math.sin(perpAngle) * offsetRadius;

      const isBlockedLeft = isLineOfSightBlocked(guard.x, guard.y, pLeftX, pLeftY, walls);
      const isBlockedRight = isLineOfSightBlocked(guard.x, guard.y, pRightX, pRightY, walls);

      // Sighted if any key point is visible
      if (!isBlockedCenter || !isBlockedLeft || !isBlockedRight) {
        // Closer to center of vision and closer distance = higher intensity
        const distFactor = Math.max(0, 1 - dist / guard.visionRange);
        const angleFactor = Math.max(0, 1 - angleDiff / (guard.fov / 2));
        const intensity = Math.min(1.0, 0.45 + distFactor * 0.4 + angleFactor * 0.15);
        return { isDetected: true, intensity };
      }
    }
  }

  return { isDetected: false, intensity: 0 };
}

// Resolve circle-AABB box collision for player with robust multi-pass sliding
export function resolveCircleWallCollision(
  cx: number,
  cy: number,
  radius: number,
  walls: Wall[]
): Position {
  let newX = cx;
  let newY = cy;

  // Multi-pass relaxation to prevent clipping through overlapping walls or corners
  for (let pass = 0; pass < 3; pass++) {
    for (const wall of walls) {
      // Find closest point on rectangle to circle center
      const nearestX = Math.max(wall.x, Math.min(newX, wall.x + wall.width));
      const nearestY = Math.max(wall.y, Math.min(newY, wall.y + wall.height));

      const dx = newX - nearestX;
      const dy = newY - nearestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist === 0) {
          // Center is inside, push out towards nearest edge
          const distLeft = Math.abs(newX - wall.x);
          const distRight = Math.abs(newX - (wall.x + wall.width));
          const distTop = Math.abs(newY - wall.y);
          const distBottom = Math.abs(newY - (wall.y + wall.height));
          const minDist = Math.min(distLeft, distRight, distTop, distBottom);

          if (minDist === distLeft) newX = wall.x - radius;
          else if (minDist === distRight) newX = wall.x + wall.width + radius;
          else if (minDist === distTop) newY = wall.y - radius;
          else newY = wall.y + wall.height + radius;
        } else {
          const overlap = radius - dist;
          newX += (dx / dist) * overlap;
          newY += (dy / dist) * overlap;
        }
      }
    }
  }

  return { x: newX, y: newY };
}

// Update Guard Patrol State
export function updateGuard(guard: Guard, dt: number): void {
  if (!guard.waypoints || guard.waypoints.length === 0) return;

  const target = guard.waypoints[guard.currentWaypointIndex];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 6) {
    // Reached waypoint, wait a moment before turning and walking to next
    guard.waitTimer += dt;
    if (guard.waitTimer >= guard.waitDuration) {
      guard.waitTimer = 0;
      guard.currentWaypointIndex = (guard.currentWaypointIndex + 1) % guard.waypoints.length;
    }
  } else {
    // Move towards target
    const targetAngle = Math.atan2(dy, dx);
    guard.angle = rotateTowards(guard.angle, targetAngle, 3.8 * dt);

    const moveStep = Math.min(dist, guard.speed * 60 * dt);
    guard.x += Math.cos(guard.angle) * moveStep;
    guard.y += Math.sin(guard.angle) * moveStep;
  }
}

// Generate Vision Cone Polygon points with wall occlusion
export function calculateVisionPolygon(guard: Guard, walls: Wall[], rayCount = 42): Position[] {
  const points: Position[] = [{ x: guard.x, y: guard.y }];
  const halfFov = guard.fov / 2;
  const startAngle = guard.angle - halfFov;
  const step = guard.fov / (rayCount - 1);

  for (let i = 0; i < rayCount; i++) {
    const rayAngle = startAngle + i * step;
    const hit = castRay(guard.x, guard.y, rayAngle, guard.visionRange, walls);
    points.push({ x: hit.x, y: hit.y });
  }

  return points;
}

// Particle System helpers
export function createSparks(x: number, y: number, color: string, count = 16): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 1.5 + Math.random() * 3.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 2.5,
      color,
      alpha: 1,
      decay: 0.025 + Math.random() * 0.02,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((p) => {
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      p.alpha -= p.decay * 60 * dt;
      p.radius = Math.max(0.2, p.radius - 0.03 * 60 * dt);
      return p;
    })
    .filter((p) => p.alpha > 0);
}
