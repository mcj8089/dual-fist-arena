// src/art/theme.js — 美术层：CSS 变量注入 + 5 章色调变体（同一背景 setTint，不新增生图）
import { GAME } from "config/game.config.js";

export function applyTheme({ hue = GAME.theme.hue } = {}) {
  document.documentElement.style.setProperty("--hue", String(hue));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", `hsl(${hue} 55% 16%)`);
}

/** 关卡 -> 背景色调；只有一张 bg_arena.webp，靠 tint + 视差 + 亮度做章节差异 */
export const LEVEL_LOOK = {
  bg_arena: { tint: 0xffffff, alpha: 1, far: 0x9a8e84, near: 0xffc98a },
  chapter_1: { tint: 0xffffff, alpha: 1, far: 0x9a8e84, near: 0xffc98a },
  chapter_2: { tint: 0xffd9a8, alpha: .96, far: 0xffb46a, near: 0xffd9a8 },
  chapter_3: { tint: 0xbcd6ff, alpha: .97, far: 0x86b8ff, near: 0xd8e6ff },
  chapter_4: { tint: 0xffb9c8, alpha: .95, far: 0xff8fa8, near: 0xffd0dc },
  chapter_5: { tint: 0xc9b6ff, alpha: .94, far: 0xa98cff, near: 0xe0d4ff }
};

export function lookFor(key) { return LEVEL_LOOK[key] || LEVEL_LOOK.bg_arena; }
export function lookForChapter(ch) { return LEVEL_LOOK[`chapter_${ch}`] || LEVEL_LOOK.bg_arena; }

export const DEPTH = { bg: 0, far: 1, near: 2, prop: 3, entity: 5, judge: 8, fx: 10, top: 20 };
