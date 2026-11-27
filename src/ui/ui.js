// src/ui/ui.js — DOM 覆盖层：菜单 / 关卡 / 商店 / HUD / 判定带 / 引导 / 结算 / 分享
// 全部控件由 styles.css 材质组件渲染（零 UI 生图），文案一律走 t()。
import { t } from "core/i18n.js";
import { open as shareOpen, PLATFORMS, inviteText } from "core/share.js";
import { canShow, track } from "core/ads.js";

const root = () => document.getElementById("ui-root");
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };

function button(labelKey, variant = "", onClick, iconSvg = "") {
  const b = el("button", `btn ${variant}`);
  if (iconSvg) { const i = el("span", "btn__icon"); i.innerHTML = iconSvg; b.appendChild(i); }  // 只允许内置常量 SVG
  b.appendChild(el("span", "btn__label", t(labelKey)));
  b.addEventListener("click", onClick);
  return b;
}

const ICONS = {
  play: '<svg class="btn__icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  share: '<svg class="btn__icon" viewBox="0 0 24 24"><path d="M18 8a3 3 0 10-2.83-4H15a3 3 0 00.17 4L9.4 11.7A3 3 0 109 15.3l5.75 3.06A3 3 0 1016 16l-5.6-3 5.75-3.06z"/></svg>',
  home: '<svg class="btn__icon" viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-5H9v5H5a1 1 0 01-1-1z"/></svg>',
  levels: '<svg class="btn__icon" viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>',
  help: '<svg class="btn__icon" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2zm.4-4.2c-.5.4-.9.7-.9 1.4h-2c0-1.3.7-2 1.4-2.6.6-.5.6-.9.6-1.4a1.8 1.8 0 00-3.6.2H7.4A3.8 3.8 0 0111 6.8c2 0 3.6 1.2 3.6 3 0 1.4-.9 2.1-1.2 2.8z"/></svg>',
  pause: '<svg class="btn__icon" viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  extra: '<svg class="btn__icon" viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z"/></svg>',
  fist: '<svg class="btn__icon" viewBox="0 0 24 24"><path d="M7 11V7a1.5 1.5 0 013 0v3-5a1.5 1.5 0 013 0v5-4a1.5 1.5 0 013 0v5-2a1.5 1.5 0 013 0v6c0 4-2.5 7-7 7H9c-3 0-5-2-5-5v-4a1.5 1.5 0 013 0z"/></svg>',
  eye: '<svg class="btn__icon" viewBox="0 0 24 24"><path d="M12 5c5 0 9 4.5 9 7s-4 7-9 7-9-4.5-9-7 4-7 9-7zm0 3.5A3.5 3.5 0 1012 15.5 3.5 3.5 0 0012 8.5z"/></svg>'
};

/** 商店卡的 8 个内联 SVG 图标（零生图） */
const ITEM_GLYPHS = [
  '<svg viewBox="0 0 48 48"><path d="M10 40C18 32 24 22 34 8l4 4C26 26 20 34 14 42z"/></svg>',
  '<svg viewBox="0 0 48 48"><path d="M22 8h16v14H22zM26 22h4v20h-4z"/></svg>',
  '<svg viewBox="0 0 48 48"><circle cx="12" cy="36" r="5"/><circle cx="24" cy="26" r="5"/><circle cx="36" cy="14" r="5"/></svg>',
  '<svg viewBox="0 0 48 48"><path d="M24 4L30 22l-6 22-6-22z"/></svg>',
  '<svg viewBox="0 0 48 48"><path d="M20 6h8v10h10v8H28v18h-8V24H10v-8h10z"/></svg>',
  '<svg viewBox="0 0 48 48"><path d="M24 42S6 30 6 18a10 10 0 0118-6 10 10 0 0118 6c0 12-18 24-18 24z"/></svg>',
  '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="24" cy="24" r="5"/></svg>',
  '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="4"/><path d="M18 18h12M18 24h12M18 30h8" stroke="currentColor" stroke-width="3"/></svg>'
];

function iconBtn(labelKey, iconKey, onClick, textKey = null) {
  const b = el("button", "btn btn--ghost btn--bare");
  b.setAttribute("aria-label", t(labelKey)); b.title = t(labelKey);
  const i = el("span", "btn__icon"); i.innerHTML = ICONS[iconKey] || ICONS.share;
  b.appendChild(i);
  if (textKey) b.appendChild(el("span", "btn__label", t(textKey)));
  b.addEventListener("click", onClick);
  return b;
}
function corner(actions) { const c = el("div", "corner-actions"); actions.forEach((a) => c.appendChild(a)); return c; }

/** 屏幕中央的单屏容器：每屏只有一个焦点元素，其余按大小与亮度递减 */
function screen(panel) {
  const wrap = el("div", "screen");
  wrap.appendChild(panel);
  root().appendChild(wrap);
  return wrap;
}

export const UI = {
  handlers: null,
  guideKey: null,
  levelPage: 0,

  init(handlers) { this.handlers = handlers; },
  act(name, payload) { try { this.handlers?.[name]?.(payload); } catch (e) { console.warn("[ui] action failed", name, e); } },
  clear() { root().replaceChildren(); this.guideKey = null; },

  /* ---------- 主菜单 ---------- */
  menu({ best = 0, level = 1 } = {}) {
    this.clear();
    const panel = el("div", "panel panel--menu");
    panel.append(
      el("p", "eyebrow", t("game.kicker")),
      el("h1", "panel__title", t("game.title")),
      el("p", "panel__sub", t("game.tagline"))
    );
    const stats = el("div", "stat-row");
    const mk = (label, value) => {
      const c = el("span", "stat");
      c.append(el("i", "stat__num", String(value)), el("span", "stat__label", label));
      return c;
    };
    stats.append(mk(t("overlay.bestLabel"), best), mk(t("hud.level"), level));
    panel.appendChild(stats);
    const row = el("div", "btn-row");
    row.append(button("menu.play", "btn--primary", () => this.act("start"), ICONS.play));
    panel.appendChild(row);
    panel.appendChild(corner([
      iconBtn("menu.levels", "levels", () => this.act("levels")),
      iconBtn("menu.howTo", "help", () => this.help()),
      iconBtn("menu.share", "share", () => this.share({}))
    ]));
    screen(panel);
  },

  /* ---------- 40 关分页选择 ---------- */
  levels({ unlocked = 1, current = 1, count = 40 } = {}) {
    this.clear();
    const pages = Math.ceil(count / 10);
    this.levelPage = Math.max(0, Math.min(pages - 1, this.levelPage));
    const panel = el("div", "panel panel--wide");
    panel.appendChild(el("h2", "panel__title", t("levels.title")));
    const grid = el("div", "lvl-grid");
    for (let i = 0; i < 10; i++) {
      const id = this.levelPage * 10 + i + 1;
      const b = el("button", `lvl-cell ${id === current ? "is-current" : ""} ${id > unlocked ? "is-locked" : ""}`);
      b.appendChild(el("span", "lvl-cell__num", id > count ? "" : String(id)));
      if (id > unlocked) b.appendChild(el("span", "lvl-cell__lock", t("levels.locked")));
      if (id <= unlocked && id <= count) b.addEventListener("click", () => this.act("selectLevel", id));
      else b.disabled = true;
      grid.appendChild(b);
    }
    panel.appendChild(grid);
    const nav = el("div", "btn-row");
    nav.append(
      button("levels.prev", "btn--ghost", () => { this.levelPage--; this.levels({ unlocked, current, count }); }),
      el("span", "chip", `${t("levels.page")} ${this.levelPage + 1} / ${pages}`),
      button("levels.next", "btn--ghost", () => { this.levelPage++; this.levels({ unlocked, current, count }); })
    );
    panel.appendChild(nav);
    panel.appendChild(corner([iconBtn("menu.home", "home", () => this.act("home"))]));
    screen(panel);
  },

  /* ---------- 战前商店 / 升级 ---------- */
  shop({ level = 1, coins = 0, items = [] } = {}) {
    this.clear();
    const panel = el("div", "panel panel--wide");
    const head = el("div", "hud__group");
    head.append(el("span", "chip", `${t("hud.level")} ${level}`), el("span", "chip chip--gold", `${t("hud.coins")} ${coins}`));
    panel.append(el("h2", "panel__title", t("shop.title")), head);
    const grid = el("div", "card-grid");
    items.forEach((it, idx) => {
      const card = el("div", "card");
      const glyph = el("span", "card__glyph"); glyph.innerHTML = ITEM_GLYPHS[idx % ITEM_GLYPHS.length];
      card.append(glyph, el("span", "card__name", it.label));
      const lv = it.level || 0;
      const label = lv >= 3 ? t("shop.maxed") : lv === 0 ? `${t("shop.unlock")} ${it.price}` : `${t("shop.upgrade")} ${it.price}`;
      const b = el("button", `btn ${lv >= 3 ? "btn--ghost" : "btn--good"}`);
      b.appendChild(el("span", "btn__label", label));
      b.disabled = lv >= 3;
      b.addEventListener("click", () => this.act("buy", it.id));
      card.appendChild(el("span", "card__level", `Lv ${lv}/3`));
      card.appendChild(b);
      grid.appendChild(card);
    });
    panel.appendChild(grid);
    const row = el("div", "btn-row");
    row.append(button("shop.start", "btn--primary", () => this.act("fight"), ICONS.play));
    if (canShow("doubleCoins")) row.append(button("shop.watchAd", "btn--gold", () => this.act("adCoins"), ICONS.extra));
    row.append(button("shop.back", "btn--ghost", () => this.act("shopBack")));
    panel.appendChild(row);
    panel.appendChild(corner([iconBtn("menu.share", "share", () => this.share({}))]));
    screen(panel);
  },

  /* ---------- 战斗 HUD ---------- */
  hud(snap) {
    const top = el("div", "hud");
    const left = el("div", "hud__group");
    left.append(
      el("span", "chip", `${t("hud.level")} ${snap.level}`),
      el("span", "chip", `${t("hud.score")} ${snap.score}`),
      el("span", "chip chip--gold", `${t("hud.coins")} ${snap.coins}`),
      el("span", "chip", `${t("hud.wave")} ${snap.wave}/${snap.waves}`)
    );
    const right = el("div", "hud__group");
    const bar = el("div", `bar ${snap.hp < 34 ? "bar--low" : ""}`);
    const fill = el("i", "bar__fill"); fill.style.width = `${Math.max(0, snap.hp)}%`;
    bar.append(fill, el("span", "bar__label", `${t("hud.health")} ${snap.hp}`));
    right.append(bar, el("span", "chip", `${t("hud.combo")} ${snap.combo || 0}`));
    if (snap.armed > 0) right.append(el("span", "chip chip--gold", `${t("hud.armed")} ${snap.armed}`));
    right.append(iconBtn("menu.pause", "pause", () => this.act("pause")));
    top.append(left, right);
    const holder = root().querySelector(".hud");
    if (holder) holder.replaceWith(top); else root().prepend(top);
    this.pad();
  },

  /* ---------- 触屏控制盘（只有 body.pg-touch 时显示；键名与 onTouch 对齐） ---------- */
  pad() {
    if (!document.body.classList.contains("pg-touch")) return;
    if (root().querySelector(".pad")) return;
    const col = (keys) => {
      const g = el("div", "pad__group");
      for (const [key, label, extra] of keys) {
        const b = el("button", `pad__btn ${extra || ""}`);
        b.type = "button";
        b.dataset.touch = key;                       // 验收脚本按这个属性找按钮
        b.setAttribute("aria-label", label);
        b.textContent = label;
        const down = (e) => {
          e.preventDefault();
          b.classList.add("is-down");
          this.act("touch", { key, down: true });
        };
        const up = (e) => {
          e.preventDefault();
          b.classList.remove("is-down");
          this.act("touch", { key, down: false });
        };
        b.addEventListener("pointerdown", down);
        b.addEventListener("pointerup", up);
        b.addEventListener("pointercancel", up);
        b.addEventListener("pointerleave", up);
        b.addEventListener("contextmenu", (e) => e.preventDefault());
        g.appendChild(b);
      }
      return g;
    };
    const pad = el("div", "pad");
    pad.append(
      col([["moveLeft", "◀"], ["crouch", "▼", "pad__btn--minor"], ["moveRight", "▶"]]),
      col([["jump", "⤴", "pad__btn--minor"], ["left", "✊◀", "pad__btn--strike"], ["right", "✊▶", "pad__btn--strike"]])
    );
    root().appendChild(pad);
  },

  /** 助攻按钮：常驻。次数用光不隐藏，切成「看广告 +N」；补充封顶后才禁用 */
  assist({ left = 0, canRefill = true, refill = 3, active = false } = {}) {
    let b = root().querySelector(".assist-btn");
    if (!b) {
      b = el("button", "btn btn--assist assist-btn");
      b.addEventListener("click", () => this.act("assist"));
      root().appendChild(b);
    }
    const label = left > 0 ? `${t("assist.use")} · ${left}` : canRefill ? `${t("assist.refill")} +${refill}` : t("assist.usedUp");
    b.replaceChildren(el("span", "btn__icon"), el("span", "btn__label", label));
    b.querySelector(".btn__icon").innerHTML = ICONS.eye;
    b.classList.toggle("is-empty", left === 0);
    b.classList.toggle("is-dead", left === 0 && !canRefill);
    b.classList.toggle("is-active", active);
    b.disabled = left === 0 && !canRefill;
    b.setAttribute("aria-label", label);
  },

  /** PERFECT 判定带 + 四格连击槽（CSS 材质，不用几何描边） */
  judge({ active = false, side = 0, combo = 0, hit = false } = {}) {
    let j = root().querySelector(".judge");
    if (!j) {
      j = el("div", "judge");
      j.append(el("i", "judge__band judge__band--left"), el("i", "judge__band judge__band--right"));
      const slots = el("div", "judge__slots");
      for (let i = 0; i < 4; i++) slots.appendChild(el("span", "judge__slot"));
      j.appendChild(slots);
      j.appendChild(el("div", "judge__hint"));
      root().appendChild(j);
    }
    j.classList.toggle("is-active", !!active);
    j.classList.toggle("is-hit", !!hit);
    j.dataset.side = String(side);
    const hint = j.querySelector(".judge__hint");
    hint.textContent = active && side ? t(side < 0 ? "judge.strikeLeft" : "judge.strikeRight") : "";
    hint.classList.toggle("is-on", !!active && !!side);
    const lit = Math.min(4, Math.floor(combo / 4));
    j.querySelectorAll(".judge__slot").forEach((s, i) => s.classList.toggle("is-lit", i < lit));
  },

  float(text, kind = "perfect") {
    const f = el("div", `float float--${kind}`, text);
    root().appendChild(f);
    setTimeout(() => f.remove(), 850);
  },

  /* ---------- 新手引导：底部键帽图例，照做一步进下一步 ---------- */
  keybar({ step = 0, total = 3, key = "move", touch = false, done = 3 } = {}) {
    let bar = root().querySelector(".keybar");
    if (!bar) { bar = el("div", "keybar"); root().appendChild(bar); }
    const KEYS = {
      move: touch ? "◀ ▶" : "← →",
      strike: touch ? "✊" : "ENTER",
      jump: touch ? "⤴" : "↑",
      dash: touch ? "⇥" : "SHIFT",
      crouch: touch ? "▼" : "↓"
    };
    bar.replaceChildren();
    bar.append(
      el("span", "keybar__key", KEYS[key] || "?"),
      el("span", "keybar__text", t(`guide.step_${key}`)),
      el("span", "keybar__step", `${step + 1}/${Math.max(done, total)}`)
    );
    this.guideKey = "active";
  },

  hint(text) {
    const layer = document.getElementById("hint-layer");
    if (!layer) return;
    const h = el("div", "hint", text);
    layer.replaceChildren(h);
    clearTimeout(this._hintT);
    this._hintT = setTimeout(() => h.remove(), 4200);
  },

  clearGuide() {
    root().querySelector(".keybar")?.remove();
    document.getElementById("hint-layer")?.replaceChildren();
    this.guideKey = null;
  },

  /* ---------- 暂停 / 过关 / 失败 ---------- */
  pause() {
    const m = el("div", "modal");
    const box = el("div", "panel modal__box");
    box.appendChild(el("h2", "panel__title", t("overlay.paused")));
    const row = el("div", "btn-row");
    row.append(
      button("menu.resume", "btn--primary", () => { m.remove(); this.act("resume"); }),
      button("menu.restart", "btn--warn", () => { m.remove(); this.act("restart"); })
    );
    box.appendChild(row);
    box.appendChild(corner([
      iconBtn("menu.share", "share", () => this.share({})),
      iconBtn("menu.home", "home", () => { m.remove(); this.act("home"); })
    ]));
    m.appendChild(box); root().appendChild(m);
    return m;
  },

  /** 过关结算。doubleCoins 只在「复活不可用」时出现：同一断点叠两个激励入口 = 两个都不点 */
  levelClear({ level, score, gain = 0, canRevive = false }) {
    const m = el("div", "modal");
    const box = el("div", "panel modal__box");
    box.append(el("h2", "panel__title", t("overlay.clearTitle")),
      el("p", "panel__sub", `${t("overlay.scoreLabel")} ${score} · ${t("hud.coins")} +${gain}`));
    const row = el("div", "btn-row");
    const canDouble = !canRevive && canShow("doubleCoins");
    if (canDouble) {
      row.append(button("ad.double", "btn--good", async (e) => {
        e.currentTarget.disabled = true;
        this.act("adDouble");
      }));
    }
    row.append(button("overlay.next", "btn--primary", () => { m.remove(); this.act("next"); }));
    box.appendChild(row);
    box.appendChild(corner([
      iconBtn("menu.share", "share", () => this.share({ score })),
      iconBtn("menu.home", "home", () => { m.remove(); this.act("home"); })
    ]));
    m.appendChild(box); root().appendChild(m);
    return m;
  },

  fail({ level, score, canRevive = false, canDouble = false }) {
    const m = el("div", "modal");
    const box = el("div", "panel modal__box");
    box.append(el("h2", "panel__title", t("overlay.failTitle")), el("p", "panel__sub", `${t("overlay.scoreLabel")} ${score}`));
    const row = el("div", "btn-row");
    // 复活独占：可用时其它激励入口全部让位
    if (canRevive) {
      row.append(button("ad.revive", "btn--primary", async (e) => {
        const btn = e.currentTarget; btn.disabled = true; toast(t("ad.waiting"));
        this.act("adRevive");
      }));
    } else if (canDouble) {
      row.append(button("ad.double", "btn--good", () => this.act("adDouble")));
    }
    row.append(button("overlay.retry", "btn--warn", () => { m.remove(); this.act("restart"); }));
    box.appendChild(row);
    box.appendChild(corner([
      canRevive ? iconBtn("ad.moreChances", "extra", () => this.act("adChances")) : null,
      iconBtn("menu.share", "share", () => this.share({ score })),
      iconBtn("menu.home", "home", () => { m.remove(); this.act("home"); })
    ].filter(Boolean)));
    m.appendChild(box); root().appendChild(m);
    return m;
  },

  /* ---------- 玩法说明（菜单里的 How to Play，与第 1 关内嵌引导分开） ---------- */
  help() {
    const m = el("div", "modal");
    const box = el("div", "panel modal__box");
    box.appendChild(el("h2", "panel__title", t("guide.title")));
    const list = el("ul", "guide__list");
    const touch = document.body.classList.contains("pg-touch");
    const lines = touch
      ? [["guide.tapMove", "◀▶"], ["guide.tapJump", "⤴"], ["guide.tapFists", "✊"], ["guide.timing", "✦"]]
      : [["guide.move", "←→"], ["guide.jump", "↑/W"], ["guide.attack", "↵/J"],
         ["guide.dash", "SHIFT"], ["guide.crouch", "↓/S"], ["guide.timing", "✦"]];
    lines.forEach(([k, key]) => {
      const li = el("li");
      li.append(el("kbd", "key", key), " ");
      li.appendChild(document.createTextNode(t(k)));
      list.appendChild(li);
    });
    box.append(list);
    const row = el("div", "btn-row");
    row.append(button("menu.play", "btn--primary", () => m.remove()));
    box.appendChild(row);
    m.appendChild(box); root().appendChild(m);
    m.addEventListener("click", (e) => { if (e.target === m) m.remove(); });
    return m;
  },

  /* ---------- 分享：昵称 + 10 平台 + 卡片 ---------- */
  share({ score = "", canvas = null } = {}) {
    const m = el("div", "modal");
    const box = el("div", "panel modal__box share");
    box.appendChild(el("h2", "panel__title", t("share.title")));
    const field = el("div", "share__field");
    const input = el("input", "input");
    input.placeholder = t("share.namePlaceholder"); input.maxLength = 24;
    const preview = el("span", "panel__sub", inviteText(""));
    input.addEventListener("input", () => { preview.textContent = inviteText(input.value.trim()); });
    field.append(input); box.append(field, preview);
    const grid = el("div", "share__grid");
    for (const p of PLATFORMS) {
      const b = el("button", "share__item");
      const svg = el("span");
      svg.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
      b.append(svg, el("span", null, t(p.labelKey)));
      b.addEventListener("click", async () => {
        track("share_platform", { platform: p.id });
        await shareOpen(p.id, { name: input.value.trim(), score, canvas });
        toast(p.cardOnly ? t("share.savedImage") : t("share.copied"));
      });
      grid.appendChild(b);
    }
    box.appendChild(grid);
    const row = el("div", "btn-row");
    const copy = el("button", "btn btn--ghost");
    copy.append(el("span", "btn__label", t("share.copy")));
    copy.addEventListener("click", async () => {
      await navigator.clipboard?.writeText?.(inviteText(input.value.trim()));
      track("share_copy"); toast(t("share.copied"));
    });
    row.append(copy, button("menu.play", "btn--primary", () => m.remove()));
    box.appendChild(row);
    m.appendChild(box); root().appendChild(m);
    m.addEventListener("click", (e) => { if (e.target === m) m.remove(); });
    return m;
  },

  bootDone() { document.getElementById("boot")?.classList.add("is-done"); }
};

export function toast(text) {
  const tEl = el("div", "toast", text);
  root().appendChild(tEl);
  setTimeout(() => tEl.remove(), 1800);
}
