// config/game.config.js — 全部玩法数值的唯一来源（Step 1 事实表 + 11 质点 DEMO）
export const GAME = {
  id: "dual-fist-arena",
  name: "Dual Fist Arena",
  slug: "dual-fist-arena",
  version: "1.1.0",

  // 横屏全屏设计分辨率，禁止 9:16 竖屏
  design: { width: 1280, height: 720, aspect: 16 / 9, fit: "bleed", maxPixelRatio: 3 },

  // 美术：续作沿用「纯黑剪影 + 橙色护腕」的 2D 平涂火柴人，逐帧 PNG 由 gen_frames 生成
  art: {
    style: "2d-cartoon",
    framing: "strip",
    styleLock: "flat 2D fighting game sprite, solid black silhouette, thin round-capped limbs, small round head, orange wristband, three-quarter view"
  },

  theme: { hue: 12, accent: "#ff7a2f" },
  levelsFile: "levels.js",

  frames: {
    dir: "assets/images/frames/",
    manifest: "assets/images/frame-manifest.json",
    canvas: 256,
    baseline: 16
  },

  audio: {
    dir: "assets/audio/",
    master: 0.8,
    // 音效（sfx_*）全部由 WebAudio 在运行时合成（见 src/core/audio.js 的 SYNTH 配方表），
    // 这里只登记需要走文件的 BGM。
    files: ["bgm.mp3"]
  },

  // 广告：点位 / 助攻次数经济 / 插屏频控（详见 .analysis/monetization.md）
  ads: {
    placements: {
      revive: "revive",
      doubleCoins: "doubleCoins",
      assist: "assist",
      stageClear: "stageClear",
      gameOver: "gameOver"
    },
    // 助攻=看破：按一次让接下来 6 秒的出拳窗口加宽 220ms
    assists: { perRun: 3, refill: 3, maxRefillPerRun: 2, focusBonus: 220, focusMs: 6000 },
    // 插屏：前 3 关（含第 1 关教学关）零广告，之后每 3 关一次
    interstitial: { skipFirstLevels: 3, everyNLevels: 3 }
  },

  play: {
    gravity: 5000,          // 火柴人DEMO.html:46 的 GRAVITY，ragdoll 与场景共用
    groundY: 556,
    attackRange: 116,       // 贴身接触距离：敌人必须走到拳能碰到才开判定窗口
    contactTolerance: 26,   // 命中允许的额外距离余量（骨架惯性 + 不同体型半宽）
    bodyOverlap: 72,        // 两个火柴人身体重叠的判定半径：重叠时左右两侧都算命中
    strikeLunge: 26,        // 敌人挥拳前额外前冲的像素
    moveSpeed: 320,         // px/s
    jumpVelocity: -900,     // px/s，向上
    jumpGravity: 2400,      // px/s²，玩家跳跃专用，与 ragdoll 的 GRAVITY 分开
    dashDistance: 88,       // 双击方向键 / Shift 的冲刺位移（dash_close 关才生效）
    minX: 210, maxX: 1070,  // 场地边界（关卡 arenaW 会覆盖）
    maxHp: 100,
    startingLives: 3,
    staminaMax: 6,          // stamina_budget 关的体力上限
    missLockMs: 460,        // 挥空破绽：这段时间无法再出拳
    hitDamage: 18,
    bossDamage: 28,
    coins: { clear: 60, clearPerLevel: 10, kill: 5, perfect: 2 },
    shop: { unlock: 300, upgrade: 500, adGrant: 300, maxLevel: 3 }
  }
};
