import { LevelConfig, Difficulty, Guard, Wall, InteractiveItem, MissionObjective } from '../types';

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 600;

export interface DifficultyConfig {
  id: Difficulty;
  name: string;
  nameTh: string;
  descriptionTh: string;
  badgeColor: string;
  timeLimit: number;
  alertSpeedMultiplier: number;
  guardSpeedMultiplier: number;
  guardVisionMultiplier: number;
  scoreMultiplier: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    name: 'EASY',
    nameTh: 'ง่าย (สายลับฝึกหัด)',
    descriptionTh: 'เวลา 80 วินาที, ยามมองเห็นสั้นลง, เกจ Alert ขึ้นช้าลง',
    badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60',
    timeLimit: 80,
    alertSpeedMultiplier: 0.65,
    guardSpeedMultiplier: 0.85,
    guardVisionMultiplier: 0.85,
    scoreMultiplier: 1.0,
  },
  normal: {
    id: 'normal',
    name: 'NORMAL',
    nameTh: 'ปานกลาง (เจ้าหน้าที่มืออาชีพ)',
    descriptionTh: 'เวลา 60 วินาที, ความเร็วและระยะสายตายามระดับมาตรฐาน',
    badgeColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/60',
    timeLimit: 60,
    alertSpeedMultiplier: 1.0,
    guardSpeedMultiplier: 1.0,
    guardVisionMultiplier: 1.0,
    scoreMultiplier: 1.3,
  },
  hard: {
    id: 'hard',
    name: 'HARD',
    nameTh: 'ยาก (ระดับฝันร้าย)',
    descriptionTh: 'เวลา 40 วินาที, ยามเดินไว สายตากว้าง และ Alert พุ่งเร็วสุดขีด',
    badgeColor: 'text-rose-400 border-rose-500/40 bg-rose-950/60',
    timeLimit: 40,
    alertSpeedMultiplier: 1.55,
    guardSpeedMultiplier: 1.18,
    guardVisionMultiplier: 1.15,
    scoreMultiplier: 1.8,
  },
};

// ==========================================
// LEVEL 1: INFILTRATION & RECON
// ==========================================
export const LEVEL_1: LevelConfig = {
  levelNumber: 1,
  codeName: 'OPERATION SHADOW_ONE',
  title: 'LEVEL 1: INFILTRATION & RECON',
  titleTh: 'ด่าน 1: การลอบเร้นและค้นหากุญแจ',
  subtitle: 'SECTOR 01 - RESEARCH FACILITY',
  descriptionTh: 'ลอบเร้นเข้าไปในห้องนิรภัย Vault เพื่อเก็บ Security Key แล้วหลบหนีออกทางประตู Exit',
  playerStart: { x: 70, y: 500 },
  exitDoor: { x: 880, y: 510, width: 60, height: 70, unlocked: false, label: 'EXIT AIRLOCK' },
  decorations: [
    { text: 'SECTOR 01 // ENTRY POINT', x: 40, y: 570 },
    { text: 'SECTOR 02 // SERVER BAY', x: 40, y: 45 },
    { text: 'SECTOR 03 // CENTRAL CORRIDOR', x: 320, y: 220 },
    { text: 'VAULT // HIGH SECURITY', x: 740, y: 45 },
    { text: 'EXTRACTION // AIRLOCK', x: 820, y: 480 },
  ],
  walls: [
    // Outer boundaries
    { id: 'l1-bound-top', x: 0, y: 0, width: MAP_WIDTH, height: 20, type: 'wall' },
    { id: 'l1-bound-bottom', x: 0, y: MAP_HEIGHT - 20, width: MAP_WIDTH, height: 20, type: 'wall' },
    { id: 'l1-bound-left', x: 0, y: 0, width: 20, height: MAP_HEIGHT, type: 'wall' },
    { id: 'l1-bound-right', x: MAP_WIDTH - 20, y: 0, width: 20, height: MAP_HEIGHT, type: 'wall' },

    // Left Sector & Infiltration partitions (90px+ openings)
    { id: 'l1-w-start-1', x: 170, y: 440, width: 20, height: 140, type: 'wall' },
    { id: 'l1-w-start-2', x: 20, y: 370, width: 75, height: 20, type: 'wall' },

    // Server Bay (Top-Left)
    { id: 'l1-w-server-1', x: 180, y: 20, width: 20, height: 170, type: 'wall' },
    { id: 'l1-w-server-2', x: 20, y: 250, width: 85, height: 20, type: 'wall' },
    { id: 'l1-w-rack1', x: 55, y: 70, width: 30, height: 60, type: 'server', label: 'SERVER A' },
    { id: 'l1-w-rack2', x: 115, y: 70, width: 30, height: 60, type: 'server', label: 'SERVER B' },
    { id: 'l1-w-rack3', x: 65, y: 170, width: 60, height: 28, type: 'server', label: 'BACKUP' },

    // Central Security Hub & Corridors
    { id: 'l1-w-center-top', x: 280, y: 160, width: 140, height: 20, type: 'wall' },
    { id: 'l1-w-center-p1', x: 280, y: 270, width: 40, height: 70, type: 'pillar' },
    { id: 'l1-w-center-p2', x: 440, y: 270, width: 40, height: 70, type: 'pillar' },
    { id: 'l1-w-center-bottom', x: 350, y: 420, width: 140, height: 20, type: 'wall' },

    // Crates Cover Zone
    { id: 'l1-w-crate-1', x: 215, y: 470, width: 44, height: 44, type: 'crate', label: 'CRATE' },
    { id: 'l1-w-crate-2', x: 540, y: 470, width: 48, height: 40, type: 'crate', label: 'CARGO' },

    // Upper Office Partition
    { id: 'l1-w-office', x: 500, y: 20, width: 20, height: 140, type: 'wall' },
    { id: 'l1-w-desk', x: 330, y: 55, width: 75, height: 28, type: 'terminal', label: 'DESK' },

    // Security Vault Room (Top-Right where Key is located)
    { id: 'l1-w-vault-left-top', x: 660, y: 20, width: 20, height: 80, type: 'wall' },
    { id: 'l1-w-vault-left-bot', x: 660, y: 190, width: 20, height: 50, type: 'wall' },
    { id: 'l1-w-vault-bottom', x: 660, y: 240, width: 185, height: 20, type: 'wall' },
    { id: 'l1-w-vault-barrier', x: 775, y: 55, width: 22, height: 85, type: 'pillar' },

    // Lower-Right Holding & Exit Corridors
    { id: 'l1-w-exit-top', x: 660, y: 330, width: 185, height: 20, type: 'wall' },
    { id: 'l1-w-exit-guardpost', x: 660, y: 440, width: 20, height: 140, type: 'wall' },
    { id: 'l1-w-exit-pillar', x: 770, y: 410, width: 32, height: 70, type: 'pillar' },
  ],
  items: [
    {
      id: 'l1-key',
      type: 'key',
      x: 850,
      y: 90,
      radius: 12,
      label: 'SECURITY KEY',
      codeName: 'GOLD KEY',
      collected: false,
    },
  ],
  getInitialObjectives: () => [
    {
      id: 'l1-obj-key',
      targetItemId: 'l1-key',
      title: 'Obtain Security Key',
      titleTh: 'ตามหากุญแจรักษาความปลอดภัย (Security Key)',
      completed: false,
      type: 'key',
    },
    {
      id: 'l1-obj-exit',
      title: 'Escape via Extraction Airlock',
      titleTh: 'หลบหนีออกจากพื้นที่ทางประตู EXIT',
      completed: false,
      type: 'exit',
    },
  ],
  getGuards: (difficulty: Difficulty) => {
    const diff = DIFFICULTY_CONFIGS[difficulty];
    const sMult = diff.guardSpeedMultiplier;
    const vMult = diff.guardVisionMultiplier;

    const baseGuards: Guard[] = [
      // Guard 1: Patrols Sector 1 corridors
      {
        id: 1,
        x: 100,
        y: 310,
        radius: 14,
        speed: 1.6 * sMult,
        angle: 0,
        fov: Math.PI / 3,
        visionRange: 165 * vMult,
        closeDetectionRadius: 28,
        waypoints: [
          { x: 100, y: 310 },
          { x: 230, y: 310 },
          { x: 230, y: 420 },
          { x: 100, y: 420 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.4,
        state: 'patrol',
      },
      // Guard 2: Central Corridor Scanner
      {
        id: 2,
        x: 380,
        y: 210,
        radius: 14,
        speed: 1.8 * sMult,
        angle: Math.PI / 2,
        fov: Math.PI / 2.7,
        visionRange: 180 * vMult,
        closeDetectionRadius: 30,
        waypoints: [
          { x: 250, y: 210 },
          { x: 520, y: 210 },
          { x: 520, y: 370 },
          { x: 250, y: 370 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.3,
        state: 'patrol',
      },
      // Guard 3: Vault entrance & corridor
      {
        id: 3,
        x: 580,
        y: 145,
        radius: 14,
        speed: 1.6 * sMult,
        angle: 0,
        fov: Math.PI / 2.6,
        visionRange: 180 * vMult,
        closeDetectionRadius: 30,
        waypoints: [
          { x: 570, y: 70 },
          { x: 570, y: 145 },
          { x: 730, y: 145 },
          { x: 730, y: 195 },
          { x: 570, y: 195 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.5,
        state: 'patrol',
      },
      // Guard 4: Exit sector gatekeeper
      {
        id: 4,
        x: 740,
        y: 520,
        radius: 14,
        speed: 1.7 * sMult,
        angle: Math.PI,
        fov: Math.PI / 2.7,
        visionRange: 175 * vMult,
        closeDetectionRadius: 32,
        waypoints: [
          { x: 750, y: 520 },
          { x: 580, y: 520 },
          { x: 580, y: 385 },
          { x: 750, y: 385 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.6,
        state: 'patrol',
      },
    ];

    if (difficulty === 'easy') {
      return [baseGuards[0], baseGuards[2]]; // 2 guards
    }
    if (difficulty === 'normal') {
      return [baseGuards[0], baseGuards[1], baseGuards[2]]; // 3 guards
    }
    return baseGuards; // 4 guards on hard
  },
};

// ==========================================
// LEVEL 2: CYBER INTRUSION
// ==========================================
export const LEVEL_2: LevelConfig = {
  levelNumber: 2,
  codeName: 'OPERATION CYBER_OVERRIDE',
  title: 'LEVEL 2: CYBER INTRUSION',
  titleTh: 'ด่าน 2: เจาะระบบและแฮกเทอร์มินอล',
  subtitle: 'SECTOR 02 - CYBER SECURITY WING',
  descriptionTh: 'ค้นหา Access Card แล้วแฮก Terminal 2 จุด (Alpha และ Beta) เพื่อปลดล็อกทางออก',
  playerStart: { x: 75, y: 75 },
  exitDoor: { x: 880, y: 510, width: 60, height: 70, unlocked: false, label: 'SECURITY GATE' },
  decorations: [
    { text: 'SECTOR 02 // VENTILATION ENTRY', x: 40, y: 45 },
    { text: 'TERMINAL ALPHA // SUBSTATION', x: 40, y: 570 },
    { text: 'CENTRAL LAB // NODE BETA', x: 380, y: 220 },
    { text: 'SECURITY OFFICE // KEYCARD', x: 720, y: 45 },
    { text: 'EXTRACTION HUB // AIRLOCK', x: 820, y: 480 },
  ],
  walls: [
    // Outer boundaries
    { id: 'l2-bound-top', x: 0, y: 0, width: MAP_WIDTH, height: 20, type: 'wall' },
    { id: 'l2-bound-bottom', x: 0, y: MAP_HEIGHT - 20, width: MAP_WIDTH, height: 20, type: 'wall' },
    { id: 'l2-bound-left', x: 0, y: 0, width: 20, height: MAP_HEIGHT, type: 'wall' },
    { id: 'l2-bound-right', x: MAP_WIDTH - 20, y: 0, width: 20, height: MAP_HEIGHT, type: 'wall' },

    // Top-Left Infiltration partition
    { id: 'l2-w-tl-1', x: 160, y: 20, width: 20, height: 110, type: 'wall' },
    { id: 'l2-w-tl-2', x: 20, y: 170, width: 140, height: 20, type: 'wall' },

    // Substation Terminal Alpha Room (Bottom-Left)
    { id: 'l2-w-bl-1', x: 190, y: 420, width: 20, height: 160, type: 'wall' },
    { id: 'l2-w-bl-2', x: 20, y: 390, width: 100, height: 20, type: 'wall' },
    { id: 'l2-w-bl-trans1', x: 40, y: 440, width: 35, height: 45, type: 'server', label: 'GEN A' },
    { id: 'l2-w-bl-trans2', x: 120, y: 440, width: 35, height: 45, type: 'server', label: 'GEN B' },

    // Central Cyber Hub (Lab where Terminal Beta is stationed)
    { id: 'l2-w-c-top', x: 290, y: 150, width: 130, height: 20, type: 'wall' },
    { id: 'l2-w-c-bot', x: 470, y: 390, width: 150, height: 20, type: 'wall' },
    { id: 'l2-w-c-p1', x: 300, y: 260, width: 35, height: 80, type: 'pillar' },
    { id: 'l2-w-c-p2', x: 620, y: 260, width: 35, height: 80, type: 'pillar' },
    { id: 'l2-w-c-crate', x: 270, y: 480, width: 45, height: 45, type: 'crate', label: 'BATTERY' },

    // Security Office (Top-Right where Access Card is stored)
    { id: 'l2-w-tr-1', x: 680, y: 20, width: 20, height: 90, type: 'wall' },
    { id: 'l2-w-tr-2', x: 680, y: 190, width: 20, height: 40, type: 'wall' },
    { id: 'l2-w-tr-bot', x: 680, y: 230, width: 170, height: 20, type: 'wall' },
    { id: 'l2-w-tr-desk', x: 760, y: 60, width: 70, height: 30, type: 'terminal', label: 'OFFICE' },

    // Extraction Corridor & Holding Bay (Bottom-Right)
    { id: 'l2-w-br-top', x: 680, y: 340, width: 170, height: 20, type: 'wall' },
    { id: 'l2-w-br-left', x: 680, y: 440, width: 20, height: 140, type: 'wall' },
    { id: 'l2-w-br-cargo', x: 760, y: 400, width: 50, height: 45, type: 'crate', label: 'CONTAINER' },
  ],
  items: [
    {
      id: 'l2-card',
      type: 'access_card',
      x: 870,
      y: 85,
      radius: 12,
      label: 'ACCESS CARD',
      codeName: 'CYBER KEYCARD',
      collected: false,
    },
    {
      id: 'l2-term-alpha',
      type: 'terminal',
      x: 85,
      y: 520,
      radius: 16,
      label: 'TERMINAL ALPHA',
      codeName: 'SUBSTATION OVERRIDE',
      collected: false,
    },
    {
      id: 'l2-term-beta',
      type: 'terminal',
      x: 470,
      y: 270,
      radius: 16,
      label: 'TERMINAL BETA',
      codeName: 'CORE FIREWALL OVERRIDE',
      collected: false,
    },
  ],
  getInitialObjectives: () => [
    {
      id: 'l2-obj-card',
      targetItemId: 'l2-card',
      title: 'Acquire Security Access Card',
      titleTh: 'ค้นหาบัตรผ่านความปลอดภัย (Access Card)',
      completed: false,
      type: 'card',
    },
    {
      id: 'l2-obj-term-a',
      targetItemId: 'l2-term-alpha',
      title: 'Override Terminal Alpha',
      titleTh: 'แฮกเจาะระบบ Terminal Alpha (สถานีย่อย)',
      completed: false,
      type: 'terminal',
    },
    {
      id: 'l2-obj-term-b',
      targetItemId: 'l2-term-beta',
      title: 'Override Terminal Beta',
      titleTh: 'แฮกเจาะระบบ Terminal Beta (โหนดกลาง)',
      completed: false,
      type: 'terminal',
    },
    {
      id: 'l2-obj-exit',
      title: 'Evacuate via Extraction Gate',
      titleTh: 'หลบหนีออกจากพื้นที่ทางประตู EXIT',
      completed: false,
      type: 'exit',
    },
  ],
  getGuards: (difficulty: Difficulty) => {
    const diff = DIFFICULTY_CONFIGS[difficulty];
    const sMult = diff.guardSpeedMultiplier;
    const vMult = diff.guardVisionMultiplier;

    const baseGuards: Guard[] = [
      // Guard 1: Top Hallway & Security Office Patrol
      {
        id: 11,
        x: 350,
        y: 85,
        radius: 14,
        speed: 1.7 * sMult,
        angle: 0,
        fov: Math.PI / 2.7,
        visionRange: 175 * vMult,
        closeDetectionRadius: 28,
        waypoints: [
          { x: 220, y: 85 },
          { x: 620, y: 85 },
          { x: 620, y: 155 },
          { x: 220, y: 155 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.2,
        state: 'patrol',
      },
      // Guard 2: Central Lab & Beta Node Guard
      {
        id: 12,
        x: 480,
        y: 340,
        radius: 14,
        speed: 1.7 * sMult,
        angle: Math.PI / 2,
        fov: Math.PI / 2.6,
        visionRange: 185 * vMult,
        closeDetectionRadius: 30,
        waypoints: [
          { x: 380, y: 340 },
          { x: 570, y: 340 },
          { x: 570, y: 210 },
          { x: 380, y: 210 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.4,
        state: 'patrol',
      },
      // Guard 3: Bottom Left Substation Sentry
      {
        id: 13,
        x: 180,
        y: 330,
        radius: 14,
        speed: 1.6 * sMult,
        angle: Math.PI / 2,
        fov: Math.PI / 2.8,
        visionRange: 170 * vMult,
        closeDetectionRadius: 28,
        waypoints: [
          { x: 90, y: 290 },
          { x: 250, y: 290 },
          { x: 250, y: 480 },
          { x: 90, y: 480 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.5,
        state: 'patrol',
      },
      // Guard 4: Right Wing Exit Airlock Sentinel
      {
        id: 14,
        x: 740,
        y: 280,
        radius: 14,
        speed: 1.8 * sMult,
        angle: Math.PI / 2,
        fov: Math.PI / 2.7,
        visionRange: 180 * vMult,
        closeDetectionRadius: 32,
        waypoints: [
          { x: 740, y: 170 },
          { x: 740, y: 300 },
          { x: 740, y: 520 },
          { x: 590, y: 520 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.3,
        state: 'patrol',
      },
    ];

    if (difficulty === 'easy') {
      return [baseGuards[0], baseGuards[2]]; // 2 guards
    }
    if (difficulty === 'normal') {
      return [baseGuards[0], baseGuards[1], baseGuards[3]]; // 3 guards
    }
    return baseGuards; // 4 guards on hard
  },
};

// ==========================================
// LEVEL 3: CLASSIFIED HEIST
// ==========================================
export const LEVEL_3: LevelConfig = {
  levelNumber: 3,
  codeName: 'OPERATION BLACK_VAULT',
  title: 'LEVEL 3: CLASSIFIED HEIST',
  titleTh: 'ด่าน 3: จารกรรมข้อมูลลับระดับสูงสุด',
  subtitle: 'SECTOR 03 - BLACK SITE MAIN COMPLEX',
  descriptionTh: 'แฮกเจาะระบบ Mainframe, ขโมยข้อมูลลับ Classified Data, ตามหา Master Key และหลบหนีออกจากอาคาร',
  playerStart: { x: 75, y: 300 },
  exitDoor: { x: 880, y: 510, width: 60, height: 70, unlocked: false, label: 'EVAC HELIPAD' },
  decorations: [
    { text: 'SECTOR 03 // INSERTION AIRLOCK', x: 40, y: 280 },
    { text: 'DATA ARCHIVES // INTEL DRIVE', x: 40, y: 45 },
    { text: 'CORE MAINFRAME // QUANTUM SERVER', x: 380, y: 45 },
    { text: 'EXECUTIVE VAULT // MASTER KEY', x: 720, y: 45 },
    { text: 'EXTRACTION ZONE // HELIPAD LIFT', x: 820, y: 480 },
  ],
  walls: [
    // Outer boundaries
    { id: 'l3-bound-top', x: 0, y: 0, width: MAP_WIDTH, height: 20, type: 'wall' },
    { id: 'l3-bound-bottom', x: 0, y: MAP_HEIGHT - 20, width: MAP_WIDTH, height: 20, type: 'wall' },
    { id: 'l3-bound-left', x: 0, y: 0, width: 20, height: MAP_HEIGHT, type: 'wall' },
    { id: 'l3-bound-right', x: MAP_WIDTH - 20, y: 0, width: 20, height: MAP_HEIGHT, type: 'wall' },

    // Archives Room (Top-Left where Classified Intel is located)
    { id: 'l3-w-arc-1', x: 180, y: 20, width: 20, height: 90, type: 'wall' },
    { id: 'l3-w-arc-2', x: 180, y: 190, width: 20, height: 40, type: 'wall' },
    { id: 'l3-w-arc-bot', x: 20, y: 220, width: 170, height: 20, type: 'wall' },
    { id: 'l3-w-arc-s1', x: 45, y: 60, width: 35, height: 50, type: 'server', label: 'DB-1' },
    { id: 'l3-w-arc-s2', x: 45, y: 130, width: 35, height: 50, type: 'server', label: 'DB-2' },

    // Insertion Partition (Left Center)
    { id: 'l3-w-ins-bot', x: 20, y: 390, width: 150, height: 20, type: 'wall' },
    { id: 'l3-w-ins-div', x: 170, y: 410, width: 20, height: 170, type: 'wall' },

    // Quantum Mainframe Chamber (Top Middle)
    { id: 'l3-w-mf-left', x: 330, y: 20, width: 20, height: 110, type: 'wall' },
    { id: 'l3-w-mf-right', x: 610, y: 20, width: 20, height: 110, type: 'wall' },
    { id: 'l3-w-mf-rack1', x: 380, y: 60, width: 45, height: 35, type: 'server', label: 'CORE A' },
    { id: 'l3-w-mf-rack2', x: 530, y: 60, width: 45, height: 35, type: 'server', label: 'CORE B' },

    // Central Security Hub & High-Cover Columns
    { id: 'l3-w-c-wall', x: 330, y: 220, width: 280, height: 20, type: 'wall' },
    { id: 'l3-w-c-p1', x: 280, y: 320, width: 45, height: 80, type: 'pillar' },
    { id: 'l3-w-c-p2', x: 450, y: 320, width: 55, height: 80, type: 'pillar' },
    { id: 'l3-w-c-p3', x: 630, y: 320, width: 45, height: 80, type: 'pillar' },
    { id: 'l3-w-c-crate1', x: 350, y: 480, width: 45, height: 45, type: 'crate', label: 'SPEC' },
    { id: 'l3-w-c-crate2', x: 540, y: 480, width: 45, height: 45, type: 'crate', label: 'CRYO' },

    // Executive Safe Vault (Top-Right where Master Key is secured)
    { id: 'l3-w-vault-left-top', x: 710, y: 20, width: 20, height: 80, type: 'wall' },
    { id: 'l3-w-vault-left-bot', x: 710, y: 180, width: 20, height: 40, type: 'wall' },
    { id: 'l3-w-vault-bot', x: 710, y: 220, width: 140, height: 20, type: 'wall' },
    { id: 'l3-w-vault-p', x: 790, y: 60, width: 25, height: 80, type: 'pillar' },

    // Extraction Helipad Sector (Bottom-Right)
    { id: 'l3-w-ex-top', x: 720, y: 340, width: 130, height: 20, type: 'wall' },
    { id: 'l3-w-ex-left', x: 720, y: 440, width: 20, height: 140, type: 'wall' },
    { id: 'l3-w-ex-col', x: 800, y: 410, width: 35, height: 65, type: 'pillar' },
  ],
  items: [
    {
      id: 'l3-mainframe',
      type: 'terminal',
      x: 475,
      y: 95,
      radius: 18,
      label: 'MAIN QUANTUM CORE',
      codeName: 'MAINFRAME HACK',
      collected: false,
    },
    {
      id: 'l3-intel',
      type: 'intel',
      x: 100,
      y: 90,
      radius: 14,
      label: 'CLASSIFIED INTEL',
      codeName: 'DATA DISK ENCRYPTION',
      collected: false,
    },
    {
      id: 'l3-masterkey',
      type: 'master_key',
      x: 870,
      y: 90,
      radius: 14,
      label: 'MASTER KEY',
      codeName: 'GOLD OMEGA KEY',
      collected: false,
    },
  ],
  getInitialObjectives: () => [
    {
      id: 'l3-obj-mainframe',
      targetItemId: 'l3-mainframe',
      title: 'Hack Quantum Mainframe',
      titleTh: 'แฮกเจาะระบบ Mainframe กลาง',
      completed: false,
      type: 'terminal',
    },
    {
      id: 'l3-obj-intel',
      targetItemId: 'l3-intel',
      title: 'Extract Classified Data Disk',
      titleTh: 'ขโมยข้อมูลลับ (Classified Data Disk)',
      completed: false,
      type: 'intel',
    },
    {
      id: 'l3-obj-masterkey',
      targetItemId: 'l3-masterkey',
      title: 'Secure Omega Master Key',
      titleTh: 'ตามหากุญแจระดับสูง (Master Key)',
      completed: false,
      type: 'key',
    },
    {
      id: 'l3-obj-exit',
      title: 'Escape Facility via Extraction Point',
      titleTh: 'หลบหนีออกจากอาคารทางประตู EXIT',
      completed: false,
      type: 'exit',
    },
  ],
  getGuards: (difficulty: Difficulty) => {
    const diff = DIFFICULTY_CONFIGS[difficulty];
    const sMult = diff.guardSpeedMultiplier;
    const vMult = diff.guardVisionMultiplier;

    const baseGuards: Guard[] = [
      // Guard 1: Archives & Left Wing Sentinel
      {
        id: 21,
        x: 230,
        y: 120,
        radius: 14,
        speed: 1.7 * sMult,
        angle: 0,
        fov: Math.PI / 2.7,
        visionRange: 180 * vMult,
        closeDetectionRadius: 28,
        waypoints: [
          { x: 230, y: 70 },
          { x: 230, y: 270 },
          { x: 100, y: 270 },
          { x: 100, y: 150 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.2,
        state: 'patrol',
      },
      // Guard 2: Quantum Mainframe Guardian
      {
        id: 22,
        x: 480,
        y: 170,
        radius: 14,
        speed: 1.8 * sMult,
        angle: Math.PI / 2,
        fov: Math.PI / 2.6,
        visionRange: 190 * vMult,
        closeDetectionRadius: 30,
        waypoints: [
          { x: 380, y: 170 },
          { x: 570, y: 170 },
          { x: 570, y: 70 },
          { x: 380, y: 70 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.3,
        state: 'patrol',
      },
      // Guard 3: Central Corridor Sweeper
      {
        id: 23,
        x: 480,
        y: 280,
        radius: 14,
        speed: 1.8 * sMult,
        angle: 0,
        fov: Math.PI / 2.6,
        visionRange: 185 * vMult,
        closeDetectionRadius: 30,
        waypoints: [
          { x: 220, y: 280 },
          { x: 740, y: 280 },
          { x: 740, y: 440 },
          { x: 220, y: 440 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.1,
        state: 'patrol',
      },
      // Guard 4: Master Key Safe Sentry
      {
        id: 24,
        x: 660,
        y: 120,
        radius: 14,
        speed: 1.7 * sMult,
        angle: 0,
        fov: Math.PI / 2.7,
        visionRange: 180 * vMult,
        closeDetectionRadius: 30,
        waypoints: [
          { x: 650, y: 70 },
          { x: 650, y: 180 },
          { x: 780, y: 180 },
          { x: 780, y: 70 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.4,
        state: 'patrol',
      },
      // Guard 5: Evacuation Airlock Heavy Guard
      {
        id: 25,
        x: 800,
        y: 520,
        radius: 14,
        speed: 1.8 * sMult,
        angle: Math.PI,
        fov: Math.PI / 2.6,
        visionRange: 185 * vMult,
        closeDetectionRadius: 32,
        waypoints: [
          { x: 820, y: 520 },
          { x: 640, y: 520 },
          { x: 640, y: 390 },
          { x: 820, y: 390 },
        ],
        currentWaypointIndex: 0,
        waitTimer: 0,
        waitDuration: 1.5,
        state: 'patrol',
      },
    ];

    if (difficulty === 'easy') {
      return [baseGuards[0], baseGuards[1], baseGuards[3]]; // 3 guards
    }
    if (difficulty === 'normal') {
      return [baseGuards[0], baseGuards[1], baseGuards[2], baseGuards[4]]; // 4 guards
    }
    return baseGuards; // 5 guards on hard
  },
};

export const LEVELS: Record<1 | 2 | 3, LevelConfig> = {
  1: LEVEL_1,
  2: LEVEL_2,
  3: LEVEL_3,
};
