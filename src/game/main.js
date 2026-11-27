// src/game/main.js — 横版走位格斗：左右移动 / 跳跃 / 冲刺 / 时机出拳 ＋ 11 质点 ragdoll 击飞
//
// 机制架构：每关在 config/levels.js 里声明 activeMech，startLevel() 调 MECHANIC_HOOKS 里对应的
// setup 方法把规则写进 this.rules；玩法循环只读 this.rules，因此加机制 = 加一个 setup + 几处读取。
import { GAME } from "config/game.config.js";
import { LEVELS, LEVEL_COUNT } from "config/levels.js";
import { Animator, makeSprite, playFx, preloadFrames, createAnims } from "core/animator.js";
import { t } from "core/i18n.js";
import { UI, toast } from "ui/ui.js";
import { detectTouch } from "game/input.js";
import { applyTheme, lookForChapter, DEPTH } from "art/theme.js";
import * as ads from "core/ads.js";
import { sfx, musicStart } from "core/audio.js";
import { Ragdoll } from "game/ragdoll.js";
import { setBoot } from "core/boot.js";

const W = () => GAME.design.width;
const H = () => GAME.design.height;
const STORE_KEY = "pipy:dual-fist-arena:v1";
const GUIDE_KEY = "pipy:dual-fist-arena:guide";
// 256×256 帧图：脚底基准 y=240、画布中心 y=128 → 中心比脚底高 112px。
const FOOT_OFFSET = 112;
const nowMs = () => performance.now();

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return { coins: s.coins | 0, unlocked: s.unlocked || {}, best: s.best | 0, level: Math.max(1, s.level | 0 || 1) };
  } catch { return { coins: 0, unlocked: {}, best: 0, level: 1 }; }
}
function saveNow(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* 隐私模式 */ } }

const WEAPONS = ["crescent", "hammer", "chain", "spear"];

const ITEMS = [
  { id: "crescent", kind: "weapon", label: "weapon.crescent", icon: "weapon-crescent" },
  { id: "hammer", kind: "weapon", label: "weapon.hammer", icon: "weapon-hammer" },
  { id: "chain", kind: "weapon", label: "weapon.chain", icon: "weapon-chain" },
  { id: "spear", kind: "weapon", label: "weapon.spear", icon: "weapon-spear" },
  { id: "power", kind: "skill", label: "skill.power", icon: "weapon-crescent" },
  { id: "vitality", kind: "skill", label: "skill.vitality", icon: "weapon-hammer" },
  { id: "window", kind: "skill", label: "skill.window", icon: "weapon-chain" },
  { id: "greed", kind: "skill", label: "skill.greed", icon: "weapon-spear" }
];

/**
 * 机制注册表：关卡表里的 activeMech 必须在这里出现，值是对应的 setup 方法名。
 * 每个 setup 只写 this.rules，玩法循环读 rules —— 机制之间互不改对方的状态。
 */
export const MECHANIC_HOOKS = {
  timing_punch: "mechTimingPunch",
  dash_close: "mechDashClose",
  jump_sweep: "mechJumpSweep",
  chain_combo: "mechChainCombo",
  break_guard: "mechBreakGuard",
  counter_stagger: "mechCounterStagger",
  parry_hold: "mechParryHold",
  feint_bait: "mechFeintBait",
  dual_read: "mechDualRead",
  crouch_tank: "mechCrouchTank",
  weapon_arm: "mechWeaponArm",
  shrinking_arena: "mechShrinkingArena",
  armored_swarm: "mechArmoredSwarm",
  cue_audio_only: "mechCueAudioOnly",
  boss_phases: "mechBossPhases",
  mirror_fist: "mechMirrorFist",
  one_hp_run: "mechOneHpRun",
  stamina_budget: "mechStaminaBudget",
  ring_out: "mechRingOut",
  phantom_double: "mechPhantomDouble",
  weak_point: "mechWeakPoint",
  tempo_lock: "mechTempoLock",
  swarm_rush: "mechSwarmRush",
  final_gauntlet: "mechFinalGauntlet",
  last_stand: "mechLastStand"
};

const emptyRules = () => ({
  dash: false, sweepChance: 0, overheadChance: 0, armor: 0, armorAll: false,
  chain: false, staggerOnDodge: false, parry: 0, feintChance: 0, dualSim: false,
  pickups: false, shrink: 0, cueHidden: false, phases: false, alternate: false,
  oneHp: false, stamina: false, ringOut: false, phantom: false, weakSide: false,
  tempo: false, rush: false, gauntlet: false, lastStand: false
});

export class MainScene extends Phaser.Scene {
  constructor() { super("main"); }

  init(data) { this.manifest = data?.frameManifest || this.registry.get("frameManifest"); }

  preload() {
    // 开屏百分比由真实加载进度驱动（不是定时器假跑）
    this.load.on("progress", (r) => setBoot(r));
    this.load.on("complete", () => setBoot(1));
    this.load.image("bg_arena", "assets/images/bg_arena.webp");
    this.load.image("bg_far", "assets/images/bg_far.webp");
    this.load.image("bg_near", "assets/images/bg_near.webp");
    // 武器道具是 4 件独立武器（不是一条动画），文件名用连字符避免被按 _NN 分组成动画
    for (const w of WEAPONS) this.load.image(`weapon-${w}`, `assets/images/frames/weapon-${w}.webp`);
    preloadFrames(this, this.manifest);
  }

  create() {
    applyTheme();
    createAnims(this, this.manifest);
    this.animator = new Animator(this, this.manifest);

    this.bg = this.add.image(W() / 2, H() / 2, "bg_arena").setDepth(DEPTH.bg).setDisplaySize(W(), H());
    this.bgFar = this.add.image(W() / 2, H() / 2, "bg_far").setDepth(DEPTH.far).setDisplaySize(W() * 1.06, H() * 1.06).setAlpha(.34);
    this.bgNear = this.add.image(W() / 2, H() / 2, "bg_near").setDepth(DEPTH.near).setDisplaySize(W() * 1.02, H() * 1.02).setAlpha(.8);

    this.arenaMinX = GAME.play.minX;
    this.arenaMaxX = GAME.play.maxX;
    this.playerX = W() / 2;
    this.playerCY = GAME.play.groundY - FOOT_OFFSET;
    this.vy = 0;
    this.onGround = true;
    this.facing = 1;
    this.crouching = false;
    this.crouchAt = 0;
    this.dashUntil = 0;
    this.held = new Set();
    this.holdStart = null;
    this.lastTap = { dir: 0, at: 0 };
    this.pose = "";
    this.poseUntil = 0;
    this.player = makeSprite(this, this.manifest, "player", this.playerX, this.playerCY);
    this.player.setDepth(DEPTH.entity).setScale(1);
    this.setPose("idle");

    this.save = loadSave();
    this.phase = "menu";
    this.enemies = [];
    this.pickups = [];
    this.bloodPools = [];
    this.combo = 0;
    this.score = 0;
    this.hp = GAME.play.maxHp;
    this.maxHp = GAME.play.maxHp;
    this.lives = GAME.play.startingLives;
    this.armedHits = 0;
    this.lockUntil = 0;
    this.wave = 0;
    this.kills = 0;
    this.levelIndex = 1;
    this.level = LEVELS[0];
    this.rules = emptyRules();
    this.spawnQueue = [];
    this.judgeState = null;
    this.stamina = GAME.play.staminaMax;
    this.lastStrikeDir = 0;
    this.focusUntil = 0;
    this.damageTaken = 0;
    this.startAt = 0;
    this.assist = { left: 0, refills: 0 };
    this.touch = detectTouch();

    const MOVE_KEYS = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowDown: "crouch", KeyS: "crouch" };
    const JUMP_KEYS = new Set(["ArrowUp", "KeyW", "Space"]);
    const ATTACK_KEYS = new Set(["Enter", "NumpadEnter", "KeyJ", "KeyK", "KeyZ", "KeyX"]);
    const GAME_KEYS = new Set([...Object.keys(MOVE_KEYS), ...JUMP_KEYS, ...ATTACK_KEYS, "Escape", "ShiftLeft", "ShiftRight", "KeyF"]);

    this.onKeyDown = (ev) => {
      const k = ev.code;
      if (!GAME_KEYS.has(k)) return;
      if (this.phase === "play" || k === "Escape") ev.preventDefault();
      if (k === "Escape") {
        if (this.phase === "play") this.pauseGame();
        else if (this.phase === "paused") { document.querySelector(".modal")?.remove(); this.resumeGame(); }
        return;
      }
      if (this.phase !== "play" || ev.repeat) return;
      if (k === "ShiftLeft" || k === "ShiftRight") { this.dash(this.facing); return; }
      if (k === "KeyF") { this.useAssist(); return; }
      const move = MOVE_KEYS[k];
      if (move) {
        this.held.add(move);
        if (move !== "crouch") {
          this.facing = move === "left" ? -1 : 1;
          if (!this.holdStart) this.holdStart = { dir: this.facing, x: this.playerX, at: nowMs() };
          this.tryDashOnDoubleTap(this.facing);
        } else if (!this.crouching) this.crouchAt = nowMs();
        this.dismissGuide(move === "left" || move === "right" ? "move" : "crouch");
        this.nudgeIfStalled();
      } else if (JUMP_KEYS.has(k)) { this.jump(); this.nudgeIfStalled(); }
      else if (ATTACK_KEYS.has(k)) this.strike(this.attackDir());
    };
    this.onKeyUp = (ev) => { const m = MOVE_KEYS[ev.code]; if (m) this.releaseMove(m); };
    this.onBlur = () => { this.held.clear(); this.holdStart = null; };
    this.onVisibility = () => { if (document.hidden) this.pauseGame(); };
    window.addEventListener("keydown", this.onKeyDown, true);
    window.addEventListener("keyup", this.onKeyUp, true);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);

    UI.init({
      start: () => this.showLevels(),
      levels: () => this.showLevels(),
      selectLevel: (id) => this.showShop(id),
      shopBack: () => this.showLevels(),
      fight: () => this.startLevel(this.levelIndex),
      buy: (id) => this.buy(id),
      adCoins: () => this.adCoins(),
      adDouble: () => this.adDouble(),
      adRevive: () => this.adRevive(),
      adChances: () => this.adChances(),
      assist: () => this.useAssist(),
      pause: () => this.pauseGame(),
      resume: () => this.resumeGame(),
      restart: () => this.startLevel(this.levelIndex),
      next: () => this.showShop(Math.min(LEVEL_COUNT, this.levelIndex + 1)),
      home: () => this.showMenu(),
      revive: () => this.revive(),
      reward: ({ kind }) => this.applyReward(kind),
      touch: ({ key, down }) => this.onTouch(key, down),
      "guide-done": () => {}
    });

    // 玩法 tick 独立于 rAF：预览面板把帧率压到 ~1fps 时走位与状态机仍在推进
    this.lastTick = nowMs();
    this.ticker = setInterval(() => this.tick(), 16);
    this.events.once("shutdown", () => {
      clearInterval(this.ticker);
      window.removeEventListener("keydown", this.onKeyDown, true);
      window.removeEventListener("keyup", this.onKeyUp, true);
      window.removeEventListener("blur", this.onBlur);
      document.removeEventListener("visibilitychange", this.onVisibility);
    });

    musicStart("bgm", { volume: .38 });
    UI.bootDone();
    UI.menu({ best: this.save.best, level: this.save.level });
    this.refreshBackdrop(1);
    this.exposeDebug();
  }

  /** 只读验收契约：smoke.cjs 靠它跟随真实玩法状态，不参与任何游戏逻辑 */
  exposeDebug() {
    window.PipyGame = window.PipyGame || {};
    window.PipyGame.debug = {
      start: (i) => this.startLevel(i || 1),
      snapshot: () => {
        const now = nowMs();
        const alive = this.enemies.filter((e) => !e.dead);
        const win = alive.find((e) => e.state === "window" && now <= e.windowEnd && !e.feint && !e.decoy);
        return {
          state: this.phase,
          levelIndex: this.levelIndex,
          score: this.score,
          goal: this.level.waves,
          progress: Math.min(1, (this.wave - 1 + (alive.length ? 0 : 1)) / this.level.waves),
          caught: this.kills,
          waves: this.level.waves,
          wave: Math.min(this.wave, this.level.waves),
          player: { x: Math.round(this.playerX), y: Math.round(this.playerCY), facing: this.facing },
          items: alive.map((e) => ({
            x: Math.round(e.rag.x), side: e.rag.x < this.playerX ? -1 : 1,
            kind: e.state, window: e.state === "window" && now <= e.windowEnd,
            feint: !!e.feint, decoy: !!e.decoy, hp: e.hp, armor: e.armor || 0
          })),
          window: win ? { active: true, side: win.rag.x < this.playerX ? -1 : 1 } : { active: false, side: 0 },
          hp: Math.round(this.hp), combo: this.combo, assist: this.assist.left,
          locked: now < this.lockUntil, stamina: Math.round(this.stamina)
        };
      }
    };
  }

  /* ---------------- 场景 / 界面流程 ---------------- */

  refreshBackdrop(chapter) {
    const look = lookForChapter(chapter);
    this.bg.setTint(look.tint).setAlpha(look.alpha);
    this.bgFar.setTint(look.far);
    this.bgNear.setTint(look.near);
  }

  showMenu() {
    this.clearEnemies();
    this.phase = "menu";
    UI.menu({ best: this.save.best, level: this.save.level });
  }

  showLevels() {
    this.clearEnemies();
    this.phase = "levels";
    UI.levels({ unlocked: Math.max(1, this.save.level), current: this.levelIndex, count: LEVEL_COUNT });
  }

  showShop(id) {
    this.clearEnemies();
    this.levelIndex = Math.min(LEVEL_COUNT, Math.max(1, id));
    this.level = LEVELS[this.levelIndex - 1];
    this.refreshBackdrop(this.level.chapter);
    this.phase = "shop";
    UI.shop({
      level: this.levelIndex,
      coins: this.save.coins,
      coins2: this.save.coins,
      items: ITEMS.map((it) => ({
        ...it,
        label: t(it.label),
        level: this.save.unlocked[it.id] || 0,
        price: GAME.play.shop.unlock
      }))
    });
  }

  buy(id) {
    const it = ITEMS.find((x) => x.id === id);
    if (!it) return;
    const lv = this.save.unlocked[id] || 0;
    if (lv >= GAME.play.shop.maxLevel) return;
    const price = lv === 0 ? GAME.play.shop.unlock : GAME.play.shop.upgrade;
    if (this.save.coins < price) { toast(t("shop.needCoins")); return; }
    this.save.coins -= price;
    this.save.unlocked[id] = lv + 1;
    saveNow(this.save);
    sfx("sfx_click", { volume: .6 });
    ads.track("shop_buy", { item: id, level: lv + 1 });
    this.showShop(this.levelIndex);
  }

  /** 商店里用广告换金币（真入口，只有 rewarded 返回 true 才加钱） */
  async adCoins() {
    const ok = await ads.rewarded(ads.AdPlacement.doubleCoins);
    if (!ok) { toast(t("ad.unavailable")); return; }
    this.save.coins += GAME.play.shop.adGrant;
    saveNow(this.save);
    toast(t("ad.rewarded"));
    this.showShop(this.levelIndex);
  }

  /** 过关结算翻倍：翻的是能花的金币（不是分数），且失败面板的复活优先，不与之同框 */
  async adDouble() {
    const ok = await ads.rewarded(ads.AdPlacement.doubleCoins);
    if (!ok) { toast(t("ad.unavailable")); return; }
    this.save.coins *= 2;
    saveNow(this.save);
    this.applyReward("doubleCoins");
    UI.hud(this.snapshot());
  }

  async adRevive() {
    const ok = await ads.rewarded(ads.AdPlacement.revive);
    if (!ok) { toast(t("ad.unavailable")); return; }
    this.revive();
  }

  async adChances() {
    const ok = await ads.rewarded(ads.AdPlacement.revive);
    if (!ok) { toast(t("ad.unavailable")); return; }
    this.lives += 1;
    this.hp = this.maxHp;
    this.applyReward("moreChances");
  }

  /** 助攻：看破（延长判定窗口）。次数用光不隐藏按钮，改成看广告补充，每局有封顶 */
  async useAssist() {
    if (this.phase !== "play") return;
    const A = GAME.ads.assists;
    if (this.assist.left > 0) {
      this.assist.left -= 1;
      this.focusUntil = nowMs() + A.focusMs;
      sfx("sfx_perfect", { volume: .35 });
      UI.float(t("assist.focus"), "perfect");
      this.pushAssist();
      return;
    }
    if (!this.canRefill()) { toast(t("assist.usedUp")); this.pushAssist(); return; }
    const ok = await ads.rewarded(ads.AdPlacement.assist);
    if (!ok) { toast(t("ad.unavailable")); this.pushAssist(); return; }
    this.refillAssist();
  }

  canRefill() { return this.assist.refills < GAME.ads.assists.maxRefillPerRun; }

  refillAssist() {
    this.assist.left += GAME.ads.assists.refill;
    this.assist.refills += 1;
    toast(t("assist.refilled"));
    this.pushAssist();
  }

  pushAssist() {
    UI.assist({
      left: this.assist.left,
      canRefill: this.canRefill(),
      refill: GAME.ads.assists.refill,
      active: nowMs() < this.focusUntil
    });
  }

  applyReward(kind) {
    if (kind === "doubleCoins") toast(t("ad.rewarded"));
    if (kind === "moreChances") { this.hp = this.maxHp; }
    saveNow(this.save);
    UI.hud(this.snapshot());
  }

  startLevel(i) {
    this.levelIndex = Math.min(LEVEL_COUNT, Math.max(1, i));
    this.level = LEVELS[this.levelIndex - 1];
    this.refreshBackdrop(this.level.chapter);
    this.clearEnemies();
    this.applyMechanic(this.level.activeMech);
    this.maxHp = GAME.play.maxHp + (this.save.unlocked.vitality || 0) * 20;
    this.hp = this.rules.oneHp ? 1 : this.maxHp;
    this.score = 0;
    this.combo = 0;
    this.wave = 0;
    this.kills = 0;
    this.damageTaken = 0;
    this.stamina = GAME.play.staminaMax;
    this.lastStrikeDir = 0;
    // 买到的武器每件给 3 次持刃重击：原来每件只给 1 拳，等于「买了没拿到」
    this.armedHits = ITEMS.filter((x) => x.kind === "weapon" && this.save.unlocked[x.id]).length * 3;
    this.lockUntil = 0;
    this.focusUntil = 0;
    this.assist = { left: GAME.ads.assists.perRun, refills: 0 };
    this.lives = this.level.lives || GAME.play.startingLives;
    const half = Math.max(320, this.level.arenaW) / 2;
    this.arenaMinX = W() / 2 - half + 40;
    this.arenaMaxX = W() / 2 + half - 40;
    this.playerX = W() / 2;
    this.playerCY = GAME.play.groundY - FOOT_OFFSET;
    this.vy = 0; this.onGround = true; this.facing = 1;
    this.held.clear();
    this.holdStart = null;
    this.poseUntil = 0;
    this.phase = "play";
    this.spawnQueue = [];
    this.startAt = nowMs();
    this.queueWave();
    ads.runStart({ level: this.levelIndex });
    UI.clear();
    UI.hud(this.snapshot());
    UI.judge({ active: false, combo: 0 });
    UI.pad();                       // 触屏控制盘（非触摸设备内部直接 return）
    this.pushAssist();
    // 第 1 关内嵌引导（不弹框挡玩法）：底部键帽图例，照做一步自动进下一步
    const guided = this.level.tutorial || this.levelIndex === 1;
    if (guided) this.startGuide();
    else { UI.clearGuide(); if (this.level.hintKey) UI.hint(t(this.level.hintKey)); }
    this.setPose("idle", true);
  }

  pauseGame() {
    if (this.phase !== "play") return;
    this.phase = "paused";
    UI.pause();
  }
  resumeGame() { if (this.phase === "paused") { this.phase = "play"; this.lastTick = nowMs(); } }

  /* ---------------- 机制注册 ---------------- */

  applyMechanic(id) {
    this.rules = emptyRules();
    const fn = id && MECHANIC_HOOKS[id];
    if (fn && typeof this[fn] === "function") this[fn]();
  }

  mechTimingPunch() { /* 基准关：只有「等提示再出拳」 */ }
  mechDashClose() { this.rules.dash = true; }
  mechJumpSweep() { this.rules.sweepChance = .45; }
  mechChainCombo() { this.rules.chain = true; }
  mechBreakGuard() { this.rules.armor = 1; }
  mechCounterStagger() { this.rules.staggerOnDodge = true; }
  mechParryHold() { this.rules.parry = 130; }
  mechFeintBait() { this.rules.feintChance = .35; }
  mechDualRead() { this.rules.dualSim = true; }
  mechCrouchTank() { this.rules.overheadChance = .45; }
  mechWeaponArm() { this.rules.pickups = true; }
  mechShrinkingArena() { this.rules.shrink = 13; }
  mechArmoredSwarm() { this.rules.armor = 1; this.rules.armorAll = true; }
  mechCueAudioOnly() { this.rules.cueHidden = true; }
  mechBossPhases() { this.rules.phases = true; }
  mechMirrorFist() { this.rules.alternate = true; }
  mechOneHpRun() { this.rules.oneHp = true; }
  mechStaminaBudget() { this.rules.stamina = true; this.stamina = GAME.play.staminaMax; }
  mechRingOut() { this.rules.ringOut = true; }
  mechPhantomDouble() { this.rules.phantom = true; this.rules.armor = 1; }
  mechWeakPoint() { this.rules.weakSide = true; }
  mechTempoLock() { this.rules.tempo = true; }
  mechSwarmRush() { this.rules.rush = true; }
  mechFinalGauntlet() { this.rules.gauntlet = true; this.rules.rush = true; }
  mechLastStand() {
    this.rules.armor = 1; this.rules.feintChance = .2; this.rules.sweepChance = .2;
    this.rules.overheadChance = .2; this.rules.gauntlet = true; this.rules.rush = true;
    this.rules.lastStand = true;
  }

  /* ---------------- 波次与敌人 ---------------- */

  queueWave() {
    if (this.phase !== "play") return;
    this.wave += 1;
    if (this.wave > this.level.waves) return;
    const n = this.level.perWave;
    const gap = this.level.intervalMs;
    for (let k = 0; k < n; k++) {
      const dual = this.rules.dualSim;
      const side = dual ? (k % 2 ? 1 : -1) : (Math.random() < .5 ? -1 : 1);
      this.spawnQueue.push({ at: nowMs() + k * gap, side, boss: this.level.boss && k === 0 && this.wave === 1 });
    }
    if (this.rules.pickups && this.wave % 2 === 1) this.dropPickup();
    UI.hud(this.snapshot());
  }

  dropPickup() {
    const x = this.arenaMinX + 60 + Math.random() * Math.max(60, this.arenaMaxX - this.arenaMinX - 120);
    const key = `weapon-${WEAPONS[Math.floor(Math.random() * WEAPONS.length)]}`;
    const sp = this.add.image(x, GAME.play.groundY - 26, key).setDepth(DEPTH.prop).setScale(.34);
    sp.setData("bob", Math.random() * 6);
    this.pickups.push({ sp, x });
  }

  spawnEnemy(side, boss) {
    const R = this.rules;
    let kind = "grunt";
    if (boss) kind = "boss";
    else if (R.weakSide) kind = "weak";
    else if (R.sweepChance && Math.random() < R.sweepChance) kind = "sweeper";
    else if (R.overheadChance && Math.random() < R.overheadChance) kind = "heavy";
    else if (this.level.chapter >= 2 && Math.random() < .3) kind = "brute";
    const char = kind === "boss" ? "boss" : kind === "heavy" || kind === "brute" ? "brute" : "grunt";
    const def = this.manifest.characters[char];
    const scale = def.scale || 1;
    const x = side < 0 ? this.arenaMinX - 54 : this.arenaMaxX + 54;
    const headY = GAME.play.groundY - 205 * scale;
    const rag = new Ragdoll(x, headY, GAME.play.groundY, { scale, spriteFootOffset: FOOT_OFFSET });
    rag.walkx = -side;
    const sp = makeSprite(this, this.manifest, char, x, rag.centerY);
    sp.setDepth(DEPTH.entity).setScale(scale);
    sp.setFlipX(side > 0);
    this.animator.play(sp, char, "idle");
    const armor = R.armorAll ? R.armor : boss ? R.armor : (Math.random() < R.armor ? 1 : 0);
    const e = {
      sp, rag, char, kind, side, boss,
      hp: boss ? this.level.bossHp || 6 : Math.max(1, Math.round(this.level.enemyHp || 1)),
      armor, armorMax: armor,
      state: "approach", windowStart: 0, windowEnd: 0, strikeAt: 0, recoverAt: 0,
      feint: false, decoy: false, dead: false, bornAt: nowMs(), removeAt: 0,
      phase: 0, weakSide: R.weakSide ? side : 0, tempoPulse: 0
    };
    this.enemies.push(e);
    // 读招关：同时在另一侧开一个「诱饵」，它的窗口短得多
    if (R.dualSim && Math.random() < .7) {
      const d = { ...e, decoy: true, windowEnd: 0 };
      // 诱饵用独立 sprite，位置在另一侧
      const dx = -side < 0 ? this.arenaMinX - 54 : this.arenaMaxX + 54;
      const drag = new Ragdoll(dx, headY, GAME.play.groundY, { scale, spriteFootOffset: FOOT_OFFSET });
      drag.walkx = side;
      const dsp = makeSprite(this, this.manifest, char, dx, drag.centerY);
      dsp.setDepth(DEPTH.entity).setScale(scale).setFlipX(-side > 0);
      this.animator.play(dsp, char, "idle");
      d.sp = dsp; d.rag = drag; d.side = -side; d.decoy = true; d.bornAt = nowMs();
      this.enemies.push(d);
    }
  }

  clearEnemies() {
    for (const e of this.enemies) e.sp.destroy();
    this.enemies.length = 0;
    for (const p of this.pickups) p.sp.destroy();
    this.pickups.length = 0;
    this.spawnQueue.length = 0;
    this.poseUntil = 0;
    this.clearBlood();
    for (const p of this.bloodPools) p.destroy();
    this.bloodPools.length = 0;
    if (this.player) { this.player.setVisible(true); this.setPose("idle", true); }
  }

  /* ---------------- 玩家走位 / 跳跃 / 冲刺 ---------------- */

  onTouch(key, down) {
    const move = key === "moveLeft" ? "left" : key === "moveRight" ? "right" : key === "crouch" ? "crouch" : null;
    if (move) {
      if (down) {
        this.held.add(move);
        if (move !== "crouch") {
          this.facing = move === "left" ? -1 : 1;
          if (!this.holdStart) this.holdStart = { dir: this.facing, x: this.playerX, at: nowMs() };
          this.tryDashOnDoubleTap(this.facing);
        } else if (!this.crouching) this.crouchAt = nowMs();
        this.dismissGuide(move === "crouch" ? "crouch" : "move");
        this.nudgeIfStalled();
      } else this.releaseMove(move);
      return;
    }
    if (!down || this.phase !== "play") return;
    if (key === "jump") { this.jump(); this.nudgeIfStalled(); return; }
    if (key === "dash") { this.dash(this.facing); return; }
    if (key === "assist") { this.useAssist(); return; }
    if (key === "left" || key === "right") this.strike(key === "left" ? -1 : 1);
  }

  jump() {
    if (this.phase !== "play" || !this.onGround) return;
    this.vy = GAME.play.jumpVelocity;
    this.onGround = false;
    this.crouching = false;
    sfx("sfx_click", { volume: .3 });
    this.dismissGuide("jump");
  }

  /** 双击方向键冲刺：dash_close 关才有意义，其它关保留但不消耗（不会破坏原有手感） */
  tryDashOnDoubleTap(dir) {
    const now = nowMs();
    if (this.lastTap.dir === dir && now - this.lastTap.at < 260) this.dash(dir);
    this.lastTap = { dir, at: now };
  }

  dash(dir) {
    if (this.phase !== "play" || !this.rules.dash) return;
    if (nowMs() < this.dashUntil) return;
    this.dashUntil = nowMs() + 170;
    this.facing = dir;
    this.playerX = Math.max(this.arenaMinX, Math.min(this.arenaMaxX, this.playerX + dir * GAME.play.dashDistance));
    sfx("sfx_click", { volume: .45 });
    playFx(this, "impact", this.playerX - dir * 24, this.playerCY + 40, { scale: .55, depth: DEPTH.prop });
    this.dismissGuide("dash");
  }

  attackDir() {
    const alive = this.enemies.filter((e) => !e.dead)
      .sort((a, b) => Math.abs(a.rag.x - this.playerX) - Math.abs(b.rag.x - this.playerX));
    const near = alive.find((e) => e.state === "window" && nowMs() <= e.windowEnd
      && Math.abs(e.rag.x - this.playerX) <= GAME.play.attackRange + GAME.play.contactTolerance);
    const pick = near || alive[0];
    return pick ? (pick.rag.x < this.playerX ? -1 : 1) : this.facing;
  }

  setPose(name, force = false) {
    if (!force && this.pose === name) return;
    this.pose = name;
    this.animator.play(this.player, "player", name, { force: true });
  }

  /* ---------------- 新手引导：照做一步进下一步 ---------------- */

  startGuide() {
    this.guideSteps = this.touch
      ? ["move", "strike", "jump"]
      : ["move", "strike", "jump"];
    this.guideIndex = 0;
    this.showGuideStep();
  }

  showGuideStep() {
    const key = this.guideSteps[this.guideIndex];
    if (!key) { UI.clearGuide(); return; }
    UI.keybar({ step: this.guideIndex, total: this.guideSteps.length, key, touch: this.touch, done: this.level.teachSteps || 3 });
  }

  dismissGuide(kind) {
    if (!this.guideSteps) return;
    const cur = this.guideSteps[this.guideIndex];
    if (!cur) return;
    if (kind !== cur) return;
    this.guideIndex += 1;
    if (this.guideIndex >= this.guideSteps.length) {
      this.guideSteps = null;
      UI.clearGuide();
      try { localStorage.setItem(GUIDE_KEY, "1"); } catch { /* 隐私模式 */ }
    } else this.showGuideStep();
  }

  /** 定时器被节流时立刻补一小步：按下就有可见位移，不必等下一次 tick */
  nudgeIfStalled() {
    if (this.phase === "play" && nowMs() - this.lastTick > 90) this.stepPlayer(.08);
  }

  releaseMove(move) {
    const h = this.holdStart;
    const cur = (this.held.has("right") ? 1 : 0) - (this.held.has("left") ? 1 : 0);
    if (h && this.phase === "play" && (move === "left" || move === "right") && cur === h.dir) {
      const P = GAME.play;
      const want = P.moveSpeed * Math.min(Math.max((nowMs() - h.at) / 1000, 0), .5);
      const done = Math.abs(this.playerX - h.x);
      const gap = (want - done) / P.moveSpeed;
      if (gap > .02) {
        this.playerX = Math.max(this.arenaMinX, Math.min(this.arenaMaxX, this.playerX + h.dir * P.moveSpeed * gap));
        this.player.setPosition(this.playerX, this.playerCY);
      }
    }
    this.holdStart = null;
    this.held.delete(move);
  }

  stepPlayer(dt) {
    const P = GAME.play;
    const dir = (this.held.has("right") ? 1 : 0) - (this.held.has("left") ? 1 : 0);
    if (dir && this.phase === "play") {
      this.playerX = Math.max(this.arenaMinX, Math.min(this.arenaMaxX, this.playerX + dir * P.moveSpeed * dt));
      this.facing = dir;
    }
    const wasCrouch = this.crouching;
    this.crouching = this.held.has("crouch") && this.onGround && this.phase === "play";
    if (this.crouching && !wasCrouch) this.crouchAt = nowMs();

    if (!this.onGround) {
      this.vy += P.jumpGravity * dt;
      this.playerCY += this.vy * dt;
      const floor = P.groundY - FOOT_OFFSET;
      if (this.playerCY >= floor) { this.playerCY = floor; this.vy = 0; this.onGround = true; }
    }
    this.player.setPosition(this.playerX, this.playerCY);
    if (nowMs() < this.poseUntil) return;
    this.setPose((!this.onGround || this.crouching) ? "guard" : "idle");
    this.player.setFlipX(this.facing < 0);
  }

  /* ---------------- 打击判定 ---------------- */

  strike(dir) {
    this.strikeCount = (this.strikeCount || 0) + 1;
    if (this.phase !== "play") return;
    const now = nowMs();
    const cooling = now < this.lockUntil;

    // 体力关：每一拳都有价钱，挥空的双倍
    if (this.rules.stamina && !cooling) {
      if (this.stamina < 1) { UI.float(t("judge.tired"), "miss"); return; }
    }
    const armed = !cooling && this.armedHits > 0;
    if (armed) this.armedHits -= 1;
    this.setPose(armed ? "attack_armed" : "attack", true);
    this.poseUntil = now + 260;
    this.player.setFlipX(dir < 0);
    sfx("sfx_punch", { volume: .55 });
    if (cooling) { UI.float(t("judge.recover"), "miss"); return; }

    // 左右必须换（mirror_fist）：连打同一边被格开
    if (this.rules.alternate && this.lastStrikeDir === dir) {
      this.lockUntil = now + GAME.play.missLockMs;
      this.lastStrikeDir = dir;
      sfx("sfx_miss", { volume: .5 });
      UI.float(t("judge.blocked"), "miss");
      if (this.rules.stamina) this.spendStamina(2);
      return;
    }
    this.lastStrikeDir = dir;

    const reach = GAME.play.attackRange + GAME.play.contactTolerance;
    const overlap = GAME.play.bodyOverlap;
    const targets = this.enemies.filter((e) => {
      if (e.dead || e.state !== "window" || now > e.windowEnd) return false;
      const dx = Math.abs(e.rag.x - this.playerX);
      if (dx > reach) return false;
      // 两人身体已经重叠时左右两侧都算命中：贴身时半像素级的左右差
      // 会把「明明贴在一起的一拳」判到空气里（触屏固定方向的拳尤其明显）
      return dx <= overlap || (e.rag.x < this.playerX ? -1 : 1) === dir;
    }).sort((a, b) => Math.abs(a.rag.x - this.playerX) - Math.abs(b.rag.x - this.playerX));
    let target = targets[0];
    // 方向兜底：按下的那一侧没有亮窗目标时，自动瞄准另一侧的亮窗（键盘 attackDir 一直如此，
    // 触屏固定方向的拳在贴脸/重叠时会因此空挥 —— 这就是「重叠挥拳没伤害」的根因）
    if (!target) {
      target = this.enemies.filter((e) => !e.dead && e.state === "window" && now <= e.windowEnd
        && Math.abs(e.rag.x - this.playerX) <= reach)
        .sort((a, b) => Math.abs(a.rag.x - this.playerX) - Math.abs(b.rag.x - this.playerX))[0];
    }

    if (!target) {
      this.combo = 0;
      this.lockUntil = now + GAME.play.missLockMs;
      sfx("sfx_miss", { volume: .5 });
      UI.float(t("judge.miss"), "miss");
      UI.judge({ active: false, combo: 0 });
      ads.track("miss", { level: this.levelIndex });
      if (this.rules.stamina) this.spendStamina(2);
      this.pushAssist();
      return;
    }

    // 假动作 / 诱饵 / 打错弱点：出手即被反制，不回血不计数
    const trap = target.feint || target.decoy
      || (this.rules.weakSide && target.weakSide !== dir)
      || (this.rules.tempo && !this.tempoOn(target));
    if (trap) {
      this.combo = 0;
      this.lockUntil = now + GAME.play.missLockMs + 120;
      sfx("sfx_miss", { volume: .6 });
      UI.float(t("judge.punished"), "miss");
      this.hp = Math.max(0, this.hp - Math.round(GAME.play.hitDamage * .5));
      UI.hud(this.snapshot());
      if (this.rules.stamina) this.spendStamina(2);
      if (this.hp <= 0) this.onFail();
      return;
    }

    const cx = (this.playerX + target.rag.x) / 2;
    const cy = this.playerCY - 20;
    this.combo += 1;
    this.score += 100 + this.combo * 20;
    this.save.coins += GAME.play.coins.perfect * this.combo * (1 + (this.save.unlocked.greed || 0) * .25);
    sfx("sfx_perfect", { volume: .7 });
    playFx(this, "perfect", cx, cy - 26, { scale: 1.1, depth: DEPTH.fx });
    playFx(this, "impact", cx, cy, { scale: .9, depth: DEPTH.fx });
    UI.float(t("judge.perfect"), "perfect");
    UI.judge({ active: true, side: dir, combo: this.combo, hit: true });
    if (this.rules.stamina) this.spendStamina(1);
    this.hitEnemy(target, dir, armed);
    this.dismissGuide("strike");
    ads.track("perfect_hit", { level: this.levelIndex, combo: this.combo });
    UI.hud(this.snapshot());
    saveNow(this.save);
  }

  spendStamina(n) {
    this.stamina = Math.max(0, this.stamina - n);
    this.staminaAt = nowMs();
  }

  tempoOn(e) {
    return ((nowMs() - e.windowStart) % 300) < 110;
  }

  hitEnemy(e, dir, armed) {
    const R = this.rules;
    // 装甲：第一拳只碎甲，不掉血（break_guard / armored_swarm / 最终关）
    if (e.armor > 0) {
      e.armor -= 1;
      e.rag.flinch(dir);
      this.animator.play(e.sp, e.char, "hit", { force: true });
      playFx(this, "impact", (this.playerX + e.rag.x) / 2, this.playerCY - 20, { scale: .8, depth: DEPTH.fx });
      UI.float(t("judge.breakArmor"), "perfect");
      e.state = "recover";
      e.recoverAt = nowMs() + 520;
      return;
    }
    const dmg = 1 + (this.save.unlocked.power || 0) + (armed ? 2 : 0);
    e.hp -= dmg;
    if (e.hp <= 0) {
      e.dead = true;
      e.removeAt = nowMs() + 2400;
      e.splatAt = nowMs() + 420;              // 击飞约半秒后落地炸成血泊
      e.splatted = false;
      e.rag.collapse(dir, e.boss ? 780 : 620);
      // 不再播被定高拉平的 die 帧：用后仰帧做击飞姿态，倾角交给 ragdoll 驱动旋转
      this.animator.play(e.sp, e.char, "hit", { force: true });
      e.sp.setData("pgAction", "dead");        // 掐掉 hit 播完回落到 idle 的兜底，落地就是血泊
      this.score += e.boss ? 800 : 120;
      this.kills += 1;
      this.save.coins += Math.round(GAME.play.coins.kill * (1 + (this.save.unlocked.greed || 0) * .25));
      ads.track("enemy_down", { level: this.levelIndex, boss: !!e.boss });
      if (e.boss && R.phases) this.phaseShift(e);
    } else {
      e.rag.flinch(dir);
      this.animator.play(e.sp, e.char, "hit", { force: true });
      playFx(this, "impact", (this.playerX + e.rag.x) / 2, this.playerCY - 20, { scale: 1, depth: DEPTH.fx });
      e.state = "recover";
      e.recoverAt = nowMs() + 700;
      if (e.boss && R.phases) this.phaseShift(e);
    }
  }

  /** 队长分段变招：越掉血越难，血条分段处换规则 */
  phaseShift(e) {
    const ratio = e.hp / Math.max(1, this.level.bossHp || 6);
    const stage = ratio > .66 ? 0 : ratio > .33 ? 1 : 2;
    if (stage === e.phase) return;
    e.phase = stage;
    if (stage === 1) { e.armor += 1; this.rules.feintChance = Math.max(this.rules.feintChance, .25); }
    if (stage === 2) { this.rules.sweepChance = Math.max(this.rules.sweepChance, .35); this.rules.overheadChance = Math.max(this.rules.overheadChance, .25); }
    playFx(this, "impact", e.rag.x, GAME.play.groundY - 140, { scale: 1.5, depth: DEPTH.fx });
    UI.float(t("judge.phase"), "perfect");
  }

  enemyStrike(e) {
    if (e.dead || this.phase !== "play") return;
    e.rag.halt();
    const now = nowMs();
    // 跳起来躲地面挥拳 / 蹲下扛住上砸：两条路互斥，读错就吃伤害
    const dodged = !this.onGround && e.kind !== "heavy";
    if (dodged) {
      UI.float(t("judge.dodge"), "perfect");
      e.state = this.rules.staggerOnDodge ? "window" : "recover";
      if (this.rules.staggerOnDodge) {
        e.windowStart = now;
        e.windowEnd = now + 560;
        this.animator.play(e.sp, e.char, "guard", { force: true });
      } else e.recoverAt = now + 700;
      return;
    }
    // 硬挡（parry_hold）：挥拳落下前一刻按下防御，零伤害并反震出窗口
    if (this.rules.parry && this.crouching && now - this.crouchAt <= this.rules.parry) {
      UI.float(t("judge.parry"), "perfect");
      playFx(this, "impact", (this.playerX + e.rag.x) / 2, this.playerCY - 20, { scale: 1.2, depth: DEPTH.fx });
      sfx("sfx_perfect", { volume: .5 });
      e.state = "window";
      e.windowStart = now;
      e.windowEnd = now + 480;
      e.rag.flinch(-e.side);
      this.animator.play(e.sp, e.char, "guard", { force: true });
      return;
    }
    // 上砸必须蹲着扛（crouch_tank）；扫腿必须跳（jump_sweep），蹲下无效
    const base = e.boss ? GAME.play.bossDamage : GAME.play.hitDamage;
    let dmg = base;
    if (e.kind === "heavy") dmg = this.crouching ? Math.round(base * .35) : base;
    if (e.kind === "sweeper") dmg = this.crouching ? base : Math.round(base * .5);
    this.hp = Math.max(0, this.hp - dmg);
    this.damageTaken += dmg;
    this.combo = 0;
    sfx("sfx_hit", { volume: .8 });
    this.setPose("hit", true);
    this.poseUntil = now + 260;
    playFx(this, "impact", (this.playerX + e.rag.x) / 2, this.playerCY - 20, { scale: 1.1, depth: DEPTH.fx });
    UI.float(t("judge.counter"), "miss");
    e.state = "recover";
    e.recoverAt = now + 900;

    // 出场判定（ring_out）：被击退真的往后退，退到墙根再挨一下就出场
    if (this.rules.ringOut) {
      const away = e.rag.x < this.playerX ? 1 : -1;
      this.playerX = Math.max(this.arenaMinX - 44, Math.min(this.arenaMaxX + 44, this.playerX + away * 62));
      const out = this.playerX <= this.arenaMinX - 40 || this.playerX >= this.arenaMaxX + 40;
      if (out) { this.hp = 0; UI.float(t("judge.ringOut"), "miss"); }
    }
    if (this.level.failSafe && this.hp < 12) this.hp = 12;   // 教学关零失败：血量地板
    UI.hud(this.snapshot());
    if (this.hp <= 0) this.onFail();
  }

  /* ---------------- 结算 ---------------- */

  onClear() {
    if (this.phase !== "play") return;
    this.phase = "result";
    const gain = Math.round((GAME.play.coins.clear + this.levelIndex * GAME.play.coins.clearPerLevel)
      * (1 + (this.save.unlocked.greed || 0) * .25));
    this.save.coins += gain;
    this.save.best = Math.max(this.save.best, this.score);
    this.save.level = Math.max(this.save.level, Math.min(LEVEL_COUNT, this.levelIndex + 1));
    saveNow(this.save);
    ads.levelCleared(this.funnelPayload());
    sfx("sfx_win");
    UI.levelClear({
      level: this.levelIndex, score: this.score, coins: this.save.coins, gain,
      canRevive: false
    });
  }

  onFail() {
    if (this.phase !== "play") return;
    this.phase = "result";
    this.dropBlood();
    this.poseUntil = Infinity;
    ads.runFail(this.funnelPayload());
    sfx("sfx_lose");
    // 失败面板 revive 独占：复活可用时不再同框放翻倍
    const canRevive = this.level.activeMech !== "last_stand" && ads.canShow(ads.AdPlacement.revive);
    UI.fail({ level: this.levelIndex, score: this.score, canRevive, canDouble: !canRevive && ads.canShow(ads.AdPlacement.doubleCoins) });
  }

  /** 阵亡表现：站姿剪影直接收掉，原地化成一滩血水（不再把站姿平放当尸体） */
  dropBlood() {
    if (this.player) this.player.setVisible(false);
    this.clearBlood();
    const y = GAME.play.groundY;
    // 出场（ring_out）死法会把玩家推到场地外，血泊跟着钳回场内，别让死亡画面看不见
    const x = Math.max(this.arenaMinX - 10, Math.min(this.arenaMaxX + 10, this.playerX));
    playFx(this, "deathburst", x, y - 108, { scale: 1.1, depth: DEPTH.fx });
    // 血泊贴图中心比画布中心低 48px，放到 groundY - 48 正好让血泊落在地面线上
    this.blood = playFx(this, "bloodpool", x, y - 48, { depth: DEPTH.entity - 1, hold: true });
  }

  clearBlood() {
    if (this.blood) { this.blood.destroy(); this.blood = null; }
  }

  /** 敌人落地的血泊：留在地面到本关结束，最多 14 滩，打久了也不会糊成一片 */
  splashBlood(x, scale = .9) {
    const gx = Math.max(this.arenaMinX - 10, Math.min(this.arenaMaxX + 10, x));
    playFx(this, "deathburst", gx, GAME.play.groundY - 48, { scale: .72, depth: DEPTH.fx });
    const pool = playFx(this, "bloodpool", gx, GAME.play.groundY - 48, { depth: DEPTH.entity - 1, scale, hold: true });
    if (!pool) return;
    this.bloodPools.push(pool);
    while (this.bloodPools.length > 14) this.bloodPools.shift()?.destroy();
  }

  /** 漏斗埋点：时长 / 进度 / 是否复活过 —— 只报 level+score 分析不了掉点 */
  funnelPayload() {
    return {
      level: this.levelIndex,
      score: this.score,
      durationMs: Math.round(nowMs() - this.startAt),
      progress: Math.round(Math.min(1, this.kills / Math.max(1, this.level.count)) * 100),
      revived: !!this.revivedThisRun,
      hpLeft: Math.round(this.hp),
      damageTaken: this.damageTaken
    };
  }

  revive() {
    this.revivedThisRun = true;
    this.hp = this.maxHp;
    this.phase = "play";
    this.combo = 0;
    this.lockUntil = nowMs() + 500;
    this.poseUntil = 0;
    this.clearBlood();                       // 复活：血泊收掉，人物重新站回场上
    this.player.setVisible(true);
    this.setPose("idle", true);
    toast(t("ad.rewarded"));
    UI.hud(this.snapshot());
  }

  snapshot() {
    return {
      level: this.levelIndex, score: this.score, coins: Math.round(this.save.coins),
      hp: Math.round(this.hp / this.maxHp * 100), lives: this.lives,
      combo: this.combo, wave: Math.min(this.wave, this.level.waves),
      waves: this.level.waves, armed: this.armedHits, stamina: Math.round(this.stamina)
    };
  }

  /* ---------------- 主循环 ---------------- */

  update() {
    const now = nowMs();
    this.bgFar.x = W() / 2 + Math.sin(now / 9000) * 14;
    this.bgNear.x = W() / 2 - Math.sin(now / 7000) * 8;
    // 掉落武器轻微上下浮动：道具要有生命感
    for (const p of this.pickups) {
      if (!p.sp.scene) continue;
      p.sp.y = GAME.play.groundY - 26 + Math.sin(now / 320 + p.sp.getData("bob")) * 4;
    }
  }

  tick() {
    const now = nowMs();
    const raw = Math.max((now - this.lastTick) / 1000, 0);
    this.lastTick = now;
    // 帧间隔夹紧：后台恢复 / 长时间掉帧不会让一帧走掉半米
    const dt = Math.min(0.05, raw);
    this.stepPlayer(dt);
    if (this.phase !== "play") { this.held.clear(); return; }

    const R = this.rules;
    // 体力回复 / 看破计时 / 场地收窄
    if (R.stamina && this.stamina < GAME.play.staminaMax && now - (this.staminaAt || 0) > 850) {
      this.stamina = Math.min(GAME.play.staminaMax, this.stamina + 1);
      this.staminaAt = now;
    }
    if (R.shrink && this.arenaMaxX - this.arenaMinX > 300) {
      this.arenaMinX += R.shrink * dt;
      this.arenaMaxX -= R.shrink * dt;
      this.playerX = Math.max(this.arenaMinX, Math.min(this.arenaMaxX, this.playerX));
    }

    // 出队生成
    if (this.spawnQueue.length && now >= this.spawnQueue[0].at) {
      const q = this.spawnQueue.shift();
      this.spawnEnemy(q.side, q.boss);
    }

    // 捡武器
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (Math.abs(p.x - this.playerX) < 46) {
        this.armedHits += 1;
        p.sp.destroy();
        this.pickups.splice(i, 1);
        sfx("sfx_click", { volume: .6 });
        UI.float(t("judge.armed"), "perfect");
        UI.hud(this.snapshot());
      }
    }

    const range = GAME.play.attackRange;
    let anyWindow = false, windowSide = 0;

    for (const e of this.enemies) {
      e.rag.step(dt);
      e.sp.x = e.rag.x;
      e.sp.y = e.rag.centerY;
      if (e.dead) {
        // 击飞段：把站姿帧按 ragdoll 躯干倾角转起来，读作「被打飞」而不是「站姿平放」；
        // 落地那一瞬炸成血泊并收掉剪影，收尾干净，也不再有被拉大的尸体图
        if (!e.splatted) {
          e.sp.setRotation(Math.max(-1.25, Math.min(1.25, -e.rag.lean)));
          if (now >= e.splatAt) {
            e.splatted = true;
            e.sp.setVisible(false);
            this.splashBlood(e.rag.x, e.char === "boss" ? 1.15 : e.char === "brute" ? 1 : .82);
          }
        }
        continue;
      }

      const rel = e.rag.x < this.playerX ? -1 : 1;
      const dist = Math.abs(e.rag.x - this.playerX);
      if (e.state === "approach") {
        const want = Math.sign(this.playerX - e.rag.x) || -e.side;
        if (e.rag.walkx !== want) e.rag.walkx = want;
        e.sp.setFlipX(rel > 0);
        if (dist <= range) {
          e.state = "window";
          e.rag.halt(this.playerX + rel * range);
          e.windowStart = now;
          const bonus = (now < this.focusUntil ? GAME.ads.assists.focusBonus : 0)
            + (R.chain ? this.combo * 12 : 0)
            + (this.save.unlocked.window || 0) * 25;
          e.windowEnd = now + this.level.comboWindow + bonus - (e.decoy ? 140 : 0);
          e.feint = Math.random() < R.feintChance;
          if (R.cueHidden) sfx("sfx_click", { volume: .5 });   // 关掉视觉提示，只剩声音与肩膀动作
          this.animator.play(e.sp, e.char, "guard");
          anyWindow = !e.decoy && !e.feint && !R.cueHidden;
          windowSide = rel;
        }
      } else if (e.state === "window") {
        if (!e.decoy && !e.feint && !R.cueHidden) { anyWindow = true; windowSide = rel; }
        if (now > e.windowEnd) {
          e.state = "strike";
          e.strikeAt = now + Math.min(this.level.tell || 320, 380);
          this.animator.play(e.sp, e.char, "attack_armed", { force: true });
        }
      } else if (e.state === "strike") {
        const lunge = range - GAME.play.strikeLunge;
        if (dist > lunge + 4) e.rag.walkx = -rel;
        else if (e.rag.walkx !== 0) e.rag.halt(this.playerX + rel * lunge);
        if (now >= e.strikeAt && dist <= range) this.enemyStrike(e);
      } else if (e.state === "recover" && now >= e.recoverAt) {
        e.state = "window";
        e.windowStart = now;
        const bonus = (now < this.focusUntil ? GAME.ads.assists.focusBonus : 0) + (R.chain ? this.combo * 12 : 0);
        e.windowEnd = now + this.level.comboWindow + bonus;
        e.feint = Math.random() < R.feintChance;
        this.animator.play(e.sp, e.char, "guard", { force: true });
        if (!e.decoy && !e.feint && !R.cueHidden) { anyWindow = true; windowSide = rel; }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dead && (now > e.removeAt || e.rag.disappeared)) { e.sp.destroy(); this.enemies.splice(i, 1); }
    }

    const judgeKey = `${anyWindow}:${windowSide}`;
    if (judgeKey !== this.judgeState) {
      this.judgeState = judgeKey;
      UI.judge({ active: anyWindow, side: windowSide, combo: this.combo });
    }

    // 波次推进
    const alive = this.enemies.some((e) => !e.dead);
    if (!alive && this.spawnQueue.length === 0) {
      if (this.wave >= this.level.waves) this.onClear();
      else if (!this.nextWaveAt || now > this.nextWaveAt) {
        this.nextWaveAt = now + (this.rules.gauntlet ? 120 : 900);
        this.queueWave();
      }
    } else this.nextWaveAt = 0;
  }
}
