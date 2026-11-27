// src/core/audio.js — WebAudio 总线。音效（sfx_*）全部在运行时用振荡器 / 噪声合成，
// 不加载任何音频文件；只有 BGM 仍走 assets/audio 下的文件。首次交互必须重试被自动播放策略拒绝的音乐。
import { GAME } from "config/game.config.js";

const AC = window.AudioContext || window.webkitAudioContext;
const ctx = AC ? new AC() : null;
const buffers = new Map();
let gainNode = null;
let noiseBuffer = null;
let music = null;
let muted = false;
let pendingMusic = null;          // { name, volume } —— ctx 被挂起时记下来，解锁后重播

function master() {
  if (!ctx) return null;
  if (!gainNode) { gainNode = ctx.createGain(); gainNode.gain.value = GAME.audio.master; gainNode.connect(ctx.destination); }
  return gainNode;
}

/** 1 秒白噪声，复用于所有需要「打击感」的音效（铜钹 / 拳风 / 破空） */
function noise() {
  if (noiseBuffer) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate);
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

let busGain = 1;                  // 本次音效的调用点音量（sfx 的 volume 参数）

/** 单音：指数包络（起音 10ms，其余按 dur 衰减） */
function tone({ type = "sine", freq = 440, freqEnd = 0, dur = .2, gain = .4, delay = 0 }) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain * busGain), t + Math.min(.012, dur * .25));
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(master());
  o.start(t); o.stop(t + dur + .03);
}

/** 噪声爆破：带通从 from 扫到 to，做拳风 / 破空 / 撞击的「气」 */
function breath({ dur = .12, gain = .4, from = 2200, to = 260, q = 1, delay = 0 }) {
  if (!ctx || muted) return;
  const src = ctx.createBufferSource();
  src.buffer = noise();
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass"; bp.Q.value = q;
  const t = ctx.currentTime + delay;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(Math.max(.0002, gain * busGain), t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(bp).connect(g).connect(master());
  src.start(t); src.stop(t + dur + .03);
}

const NOTES = (freqs, { type = "triangle", dur = .16, gain = .26, step = .09, delay = 0 } = {}) =>
  freqs.forEach((f, i) => tone({ type, freq: f, dur, gain, delay: delay + i * step }));

/** 音效配方表：名字沿用原有调用点，实现全部换成合成 */
const SYNTH = {
  // UI 轻点：短促三角波下滑，不抢玩法音
  sfx_click: (r) => tone({ type: "triangle", freq: 900 * r, freqEnd: 560 * r, dur: .055, gain: .22 }),
  // 出拳：低频拳风 + 一层中频噪声，干净利落
  sfx_punch: (r) => {
    breath({ dur: .1, gain: .34, from: 1900 * r, to: 320, q: .9 });
    tone({ type: "sine", freq: 170 * r, freqEnd: 62 * r, dur: .13, gain: .3 });
  },
  // 挨打：更沉、更长，带一点低频方波的钝感
  sfx_hit: (r) => {
    breath({ dur: .16, gain: .4, from: 1000 * r, to: 130, q: .7 });
    tone({ type: "sine", freq: 120 * r, freqEnd: 42 * r, dur: .24, gain: .42 });
    tone({ type: "square", freq: 76 * r, freqEnd: 40 * r, dur: .11, gain: .12 });
  },
  // 完美命中：明亮三连泛音，和打击音拉开质感
  sfx_perfect: (r) => {
    tone({ type: "triangle", freq: 1046 * r, dur: .28, gain: .26 });
    tone({ type: "sine", freq: 1568 * r, dur: .34, gain: .14, delay: .012 });
    tone({ type: "sine", freq: 2093 * r, dur: .2, gain: .08, delay: .026 });
  },
  // 挥空：只有风，没有实体
  sfx_miss: (r) => breath({ dur: .2, gain: .22, from: 1500 * r, to: 240, q: 1.7 }),
  // 过关：上行大调琶音
  sfx_win: (r) => NOTES([523, 659, 784, 1046].map((f) => f * r), { dur: .3, gain: .2, step: .1 }),
  // 失败：下行小三度，尾音压低
  sfx_lose: (r) => {
    NOTES([392, 330, 262].map((f) => f * r), { type: "sine", dur: .3, gain: .2, step: .14 });
    tone({ type: "sine", freq: 196 * r, dur: .55, gain: .24, delay: .42 });
  }
};

export const SFX_NAMES = Object.keys(SYNTH);

/** BGM 仍走文件：只加载 GAME.audio.files 里列出的曲子（音效不再需要预载） */
export async function loadAudio(names = GAME.audio.files) {
  if (!ctx) return names;
  const results = await Promise.allSettled(names.map(async (n) => {
    const res = await fetch(`${GAME.audio.dir}${n}`);
    if (!res.ok) throw new Error(`${n} 404`);
    buffers.set(n.replace(/\.[a-z0-9]+$/i, ""), await ctx.decodeAudioData(await res.arrayBuffer()));
  }));
  return results.map((r, i) => (r.status === "rejected" ? names[i] : null)).filter(Boolean);
}

/** 所有音效都是即时合成：没有解码、没有 404、没有缓冲等待 */
export function sfx(name, { volume = 1, rate = 1 } = {}) {
  if (!ctx || muted) return;
  const make = SYNTH[name];
  if (!make) { console.warn(`[audio] 未登记的音效 ${name}`); return; }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  busGain = Math.max(0, Math.min(1, volume));
  try { make(rate); } finally { busGain = 1; }
}

let boundState = false;
export function musicStart(name = "bgm", { loop = true, volume = .38 } = {}) {
  pendingMusic = { name, volume };
  // create() 可能早于 ctx.resume() 完成；statechange 时再补一次，消除竞态导致的全程无声
  if (ctx && !boundState) {
    boundState = true;
    ctx.addEventListener?.("statechange", () => { if (ctx.state === "running") startPending(); });
  }
  startPending();
}

function startPending() {
  if (!pendingMusic || !ctx || ctx.state !== "running") return;
  const buf = buffers.get(pendingMusic.name);
  if (!buf) return;
  if (music) return;                       // 已在播放，不重复叠
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const g = ctx.createGain(); g.gain.value = muted ? 0 : pendingMusic.volume;
  src.connect(g).connect(master());
  src.start();
  music = { src, g, volume: pendingMusic.volume };
}

export function musicStop() { try { music?.src?.stop(); } catch { /* 已停止 */ } music = null; pendingMusic = null; }
export function muteAll() { muted = true; if (music) music.g.gain.value = 0; }
export function unmuteAll() { muted = false; if (music) music.g.gain.value = music.volume ?? .38; }
export function isMusicPlaying() { return !!music && ctx?.state === "running"; }
/** 只读诊断：区分「解码失败」「ctx 被挂起」「BGM 未起播」三种无声原因 */
export function audioStatus() {
  return { state: ctx?.state || "none", buffers: [...buffers.keys()], music: !!music,
    pending: pendingMusic?.name || null, muted, synth: SFX_NAMES.length };
}

/** 首次 pointer/touch/key 交互时解锁：恢复 ctx 并重试被拒的 BGM */
export function resumeContext() {
  if (!ctx) return;
  const after = () => { startPending(); };
  if (ctx.state === "suspended") ctx.resume().then(after).catch(() => {});
  else after();
}

export function bindAudioUnlock() {
  // 每次交互都尝试（幂等）：只在 BGM 真的起播后才解绑。
  // 否则首次交互若发生在 Phaser create() 之前 / ctx.resume() 未完成，监听就被移除，之后再无重试 → 全程无声。
  const attempt = () => {
    resumeContext();
    if (isMusicPlaying()) {
      window.removeEventListener("pointerdown", attempt, true);
      window.removeEventListener("touchstart", attempt, true);
      window.removeEventListener("keydown", attempt, true);
    }
  };
  window.addEventListener("pointerdown", attempt, true);
  window.addEventListener("touchstart", attempt, true);
  window.addEventListener("keydown", attempt, true);
  resumeContext();                       // 有些浏览器无需手势，先试一次
}
