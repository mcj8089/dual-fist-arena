// src/core/boot.js — 开屏进度：数字百分比由真实加载进度驱动（不是定时器假跑）
let last = -1;

/** @param {number} ratio 0..1 真实加载比例 */
export function setBoot(ratio) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  if (pct === last) return;
  last = pct;
  const num = document.getElementById("boot-pct");
  const fill = document.getElementById("boot-fill");
  if (num) num.textContent = `${pct}%`;
  if (fill) fill.style.width = `${pct}%`;
}

/** 首帧可见后再淡出开屏，避免「100% 了还是黑的」 */
export function finishBoot() {
  window.__pipyBootOk = true;                 // 关掉开屏看门狗：真的进游戏了，别再报超时
  const boot = document.getElementById("boot");
  if (!boot) return;
  boot.classList.add("is-done");
  setTimeout(() => boot.remove(), 700);
}
