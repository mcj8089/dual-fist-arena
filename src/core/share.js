// src/core/share.js — 社媒分享：移动端 Web Share API 优先，桌面端打开平台链接；
// TikTok / Instagram / YouTube 走 Canvas 截图分享卡片（带 pipygames.com logo + 网址）。
import { GAME } from "config/game.config.js";
import { t, lang } from "core/i18n.js";

const isMobile = () => /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || navigator.share;

export const PLATFORMS = [
  { id: "fb", labelKey: "share.fb", url: (u, x) => `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${x}` },
  { id: "x", labelKey: "share.x", url: (u, x) => `https://twitter.com/intent/tweet?url=${u}&text=${x}` },
  { id: "reddit", labelKey: "share.reddit", url: (u, x) => `https://www.reddit.com/submit?url=${u}&title=${x}` },
  { id: "discord", labelKey: "share.discord", url: (u, x) => `https://discord.com/channels/@me?url=${u}&text=${x}` },
  { id: "whatsapp", labelKey: "share.whatsapp", url: (u, x) => `https://wa.me/?text=${x}%20${u}` },
  { id: "telegram", labelKey: "share.telegram", url: (u, x) => `https://t.me/share/url?url=${u}&text=${x}` },
  { id: "linkedin", labelKey: "share.linkedin", url: (u, x) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  { id: "yt", labelKey: "share.yt", cardOnly: true },
  { id: "tiktok", labelKey: "share.tiktok", cardOnly: true },
  { id: "ig", labelKey: "share.ig", cardOnly: true }
];

export const shareUrl = () => `${location.origin.startsWith("http") ? location.origin : "https://pipygames.com"}/games/${GAME.slug}/?ref=share`;

export function inviteText(name) {
  return t("share.invite", { name: name || "pipygames" });
}

const track = (name, payload) => { try { window.PipyGames?.track?.(name, payload); } catch { /* SDK 未就绪时静默 */ } };

/** 生成带 logo + 网址的分享卡片 PNG，并触发下载（TikTok/IG/YT 无法用分享链接携带图片） */
export async function buildShareCard(canvas, { name = "", score = "" } = {}) {
  const W = 1080, H = 1080;
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, `hsl(${GAME.theme.hue} 60% 24%)`);
  grad.addColorStop(1, `hsl(${GAME.theme.hue} 70% 8%)`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  const src = canvas || document.querySelector("#game-root canvas");
  if (src) {
    const ratio = Math.min(W / src.width, (H * 0.62) / src.height);
    const w = src.width * ratio, h = src.height * ratio;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 40;
    ctx.drawImage(src, (W - w) / 2, (H - h) / 2 - 40, w, h);
    ctx.restore();
  }
  ctx.textAlign = "center"; ctx.fillStyle = "#fff";
  ctx.font = `800 ${Math.round(W * 0.055)}px system-ui, sans-serif`;
  ctx.fillText(GAME.name, W / 2, H * 0.845);
  if (score !== "") {
    ctx.font = `700 ${Math.round(W * 0.038)}px system-ui, sans-serif`;
    ctx.fillStyle = `hsl(${GAME.theme.hue} 90% 78%)`;
    ctx.fillText(`${t("hud.score")} ${score}`, W / 2, H * 0.9);
  }
  ctx.font = `800 ${Math.round(W * 0.032)}px system-ui, sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.fillText("pipygames.com", W / 2, H * 0.96);            // logo 文字 + 站点名，卡片必带
  const blob = await new Promise((r) => out.toBlob(r, "image/png"));
  return { blob, url: URL.createObjectURL(blob) };
}

async function downloadCard(url) {
  const a = document.createElement("a");
  a.href = url; a.download = `${GAME.slug}-sharecard.png`;
  document.body.appendChild(a); a.click(); a.remove();
}

/**
 * 分享入口。平台按钮 → open(...)；昵称在 UI 层采集后传入。
 * 全部动作接 SDK 埋点；移动端优先系统分享面板。
 */
export async function open(platformId, { name = "", canvas = null, score = "" } = {}) {
  const p = PLATFORMS.find((x) => x.id === platformId);
  if (!p) return;
  track("share_click", { platform: platformId, lang });

  const text = encodeURIComponent(inviteText(name));
  const url = encodeURIComponent(shareUrl());

  if (p.cardOnly) {
    const { url: cardUrl } = await buildShareCard(canvas, { name, score });
    await downloadCard(cardUrl);
    if (isMobile()) {
      const file = new File([await (await fetch(cardUrl)).blob()], "sharecard.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: inviteText(name) }); }
    }
    URL.revokeObjectURL(cardUrl);
    track("share_card_saved", { platform: platformId });
    return;
  }

  if (isMobile() && navigator.share) {
    try { await navigator.share({ title: GAME.name, text: inviteText(name), url: decodeURIComponent(url) }); track("share_native", { platform: platformId }); return; }
    catch { /* 用户取消：不降级弹窗，交给 UI 层决定 */ }
  }
  window.open(p.url(url, text), "_blank", "noopener,width=680,height=620");
}

/** 运行时补注入 OG / Twitter Card（防 SPA 场景 meta 缺失；index.html 已内置一份） */
export function ensureMeta({ title, description, image }) {
  const set = (sel, attrs) => {
    let el = document.head.querySelector(sel);
    if (!el) { el = document.createElement("meta"); document.head.appendChild(el); }
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  };
  set('meta[property="og:title"]', { content: title });
  set('meta[property="og:description"]', { content: description });
  set('meta[property="og:image"]', { content: image });
  set('meta[property="og:url"]', { content: shareUrl() });
  set('meta[name="twitter:title"]', { content: title });
  set('meta[name="twitter:description"]', { content: description });
  set('meta[name="twitter:image"]', { content: image });
  document.title = `${title} | pipygames.com`;
}
