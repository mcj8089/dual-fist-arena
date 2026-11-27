// src/core/i18n.js — 双语文案：默认英文，页面不放语言切换按钮（红线 13 的唯一出口）
import { LOCALES, DEFAULT_LANG } from "config/locales.js";

const forced = new URLSearchParams(location.search).get("lang");
/** 缺词一律回落英文：默认语言即 en，页面不提供切换（红线 13 的唯一出口） */
const FALLBACK_LANG = "en";
export const lang = LOCALES[forced] ? forced : DEFAULT_LANG;
document.documentElement.lang = lang;

/** 取文案；缺失键回落英文，仍缺失则返回键名（便于静态检查发现漏键） */
export function t(key, vars) {
  const raw = (LOCALES[lang] && LOCALES[lang][key]) ?? LOCALES[FALLBACK_LANG][key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** 把 data-i18n / data-i18n-title 的节点一次性刷成当前语言 */
export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
}

/** 中英混排自检（仅开发期）：渲染到页面上的字符串不允许同时含 CJK 与英文单词 */
export function assertNoMixing(text) {
  if (import.meta.env && !import.meta.env.DEV) return true;
  return !(/[㐀-鿿]/.test(text) && /[A-Za-z]{3,}/.test(text));
}
