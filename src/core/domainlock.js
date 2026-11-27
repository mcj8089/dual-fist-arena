// src/core/domainlock.js — 域名锁：仅 localhost / pipygames.com 正常运行，其余域名 3 秒后跳转
import { DOMAINS } from "config/domains.config.js";

export function isAuthorized(host = location.hostname) {
  if (!host) return true;                                    // file:// 本地直开视为调试
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  return DOMAINS.allowed.some((d) => host === d || (DOMAINS.allowSubdomains && host.endsWith("." + d)));
}

/** 游戏照常加载，命中非授权域名时延迟跳转（不改加载结果，避免调试期误判） */
export function enforceDomainLock() {
  if (isAuthorized()) return false;
  setTimeout(() => { location.replace(DOMAINS.redirect); }, DOMAINS.delay);
  return true;
}
