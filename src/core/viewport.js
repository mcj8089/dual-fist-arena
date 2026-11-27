// src/core/viewport.js — 舞台缩放与安全区：把逻辑坐标（1280×720）映射到任意屏幕
// 引擎侧用 Phaser.Scale.ENVELOP 做 bleed 铺满；这里负责给 DOM 层的 HUD 提供
// --stage-scale（HUD 字号/间距按同一比例缩放）与安全区内边距，非 16:9 不留黑边也不压玩法。
import { GAME } from "config/game.config.js";

export const pixelRatio = () => Math.min(window.devicePixelRatio || 1, GAME.design.maxPixelRatio || 2);

export function stageScale() {
  const w = window.innerWidth || 1, h = window.innerHeight || 1;
  // bleed：按「铺满」算缩放，取较大比例；HUD 据此保证在任何比例下都与画面同尺度
  return Math.max(w / GAME.design.width, h / GAME.design.height);
}

export function installViewport() {
  const root = document.documentElement;
  const apply = () => {
    const s = stageScale();
    root.style.setProperty("--stage-scale", s.toFixed(4));
    root.style.setProperty("--vp-w", `${window.innerWidth}px`);
    root.style.setProperty("--vp-h", `${window.innerHeight}px`);
    // 触屏点击目标：物理 ≥44px，换算回逻辑像素（设计舞台会被缩放）
    root.style.setProperty("--tap-min", `${Math.max(88, Math.round(44 / Math.max(s, .4)))}px`);
    document.body.classList.toggle("is-tall", window.innerHeight > window.innerWidth);
  };
  apply();
  window.addEventListener("resize", apply, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(apply, 120));
  return apply;
}
