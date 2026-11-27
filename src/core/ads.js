// src/core/ads.js — 广告与奖励：统一走线上 pipysdk（https://pipygames.com/sdk/pipysdk.min.js）
// 必须提供 复活 / 获得更多机会 / 额外奖励 / 助攻补充 四类入口，看完广告才发奖励。
// API 依据 references/pipysdk-developer-guide.md，禁止凭猜测调用不存在的方法。
import { GAME } from "config/game.config.js";

const G = () => window.PipyGames;

export const AdPlacement = {
  revive: "revive",           // 激励视频，每局 1 次
  doubleCoins: "doubleCoins", // 激励视频，结算翻倍（翻的是金币，不是分数）
  assist: "assist",           // 激励视频，助攻次数用光后补充
  stageClear: "stageClear",   // 插屏，跳过前 3 关后每 3 关 1 次
  gameOver: "gameOver"        // 插屏，默认关闭
};

/** SDK 就绪（本地直开会降级成模拟广告，返回 false 表示不可用） */
export async function whenReady(timeoutMs = 6000) {
  const g = G();
  if (!g) return false;
  try { await Promise.race([g.ready, new Promise((_, r) => setTimeout(() => r(new Error("sdk timeout")), timeoutMs))]); return true; }
  catch { console.warn("[ads] pipysdk 未就绪，广告按钮将隐藏"); return false; }
}

/**
 * 播激励视频。调用方必须用 `if (!ok) return;` 或 `if (ok)` 守卫，未返回 true 绝不发奖。
 * @param {string} placement
 * @param {(ok:boolean)=>void} onReward 仅在 ok=true 时由调用方发放奖励
 * @returns {Promise<boolean>}
 */
export async function rewarded(placement, onReward) {
  const g = G();
  if (!g?.showRewarded) { onReward?.(false); return false; }
  const ok = await g.showRewarded(placement);
  if (ok) onReward?.(true);
  return !!ok;
}

export function canShow(placement) {
  try { return G()?.canShowAd?.(placement) !== false; } catch { return true; }
}

/** 广告期间暂停 + 静音（SDK 文档 §4） */
export function bindGamePause(pause, resume, muteFn, unmuteFn) {
  const g = G();
  if (!g) return;
  g.onAdStart?.(() => { muteFn?.(); pause(); });
  g.onAdEnd?.(() => { unmuteFn?.(); resume(); });
}

/** 局生命周期：开局 newRun / 过关 levelCleared（含插屏频控）/ 失败 gameOver */
export function runStart(payload) {
  try { G()?.newRun?.(); } catch { /* noop */ }
  G()?.track?.("run_start", payload);
}

/** 插屏只在过关动画之后，前 skipFirstLevels 关（含教学关）零广告 */
export function levelCleared(payload) {
  const g = G();
  if (!g) return;
  g.levelCleared?.(payload);
  const { skipFirstLevels = 3, everyNLevels = 3 } = GAME.ads?.interstitial || {};
  const lv = payload?.level || 1;
  if (lv > skipFirstLevels && lv % everyNLevels === 0) {
    g.showInterstitial?.(AdPlacement.stageClear, payload);
  }
}

export function runFail(payload) {
  const g = G();
  if (!g) return;
  g.gameOver?.(payload);
  g.showInterstitial?.(AdPlacement.gameOver, payload);
}

export function track(name, payload) { try { G()?.track?.(name, payload); } catch { /* noop */ } }
