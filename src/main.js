// src/main.js — 启动：域名锁 → 逐帧清单 + 音频 → Phaser 初始化（ENVELOP 铺满，不留黑边）
// 引擎是本地的 lib/phaser.min.js（禁 CDN），只挂 window.Phaser，禁止 ESM 默认导入。

/** 任何一步失败都要落到开屏页上：宁可显示一行红字，也不能停在 Loading 转圈 */
const fail = (err) => {
  const msg = (err && (err.message || String(err))) || "未知错误";
  if (window.__pipyBootFail) window.__pipyBootFail(msg);
  console.error("[boot] 启动失败:", err);
};

const Phaser = window.Phaser;
if (!Phaser) {
  fail(new Error("引擎未加载：lib/phaser.min.js 缺失或被拦截"));
  throw new Error("Phaser 未加载：检查 lib/phaser.min.js 是否存在");
}

async function boot() {
  const { enforceDomainLock } = await import("core/domainlock.js");
  enforceDomainLock();                                    // 非授权域名：3 秒后跳 pipygames.com

  const { GAME } = await import("config/game.config.js");
  const { UI } = await import("ui/ui.js");
  const { MainScene } = await import("game/main.js");
  const { setBoot, finishBoot } = await import("core/boot.js");
  const { ensureMeta } = await import("core/share.js");
  const { whenReady, bindGamePause } = await import("core/ads.js");
  const { loadAudio, bindAudioUnlock, muteAll, unmuteAll } = await import("core/audio.js");
  const { installViewport } = await import("core/viewport.js");

  installViewport();
  ensureMeta({
    title: document.title.replace(" | pipygames.com", ""),
    description: document.querySelector('meta[name="description"]')?.content || "",
    image: "poster.jpg"
  });

  setBoot(0.04);
  const [manifestRes] = await Promise.all([
    fetch(GAME.frames.manifest),
    loadAudio().catch(() => [])
  ]);
  if (!manifestRes.ok) throw new Error(`帧清单 ${GAME.frames.manifest} 返回 ${manifestRes.status}`);
  const frameManifest = await manifestRes.json();
  if (!frameManifest?.characters?.player) throw new Error("帧清单缺少 characters.player，资源不完整");
  setBoot(0.12);
  bindAudioUnlock();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game-root",
    backgroundColor: "#0b0705",
    width: GAME.design.width,
    height: GAME.design.height,
    scale: {
      // bleed：等比铺满整屏（多余部分裁掉），HUD 在 DOM 层用安全区兜住
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: { antialias: true, roundPixels: false, powerPreference: "high-performance" },
    fps: { target: 60, forceSetTimeOut: false },
    fullscreenTarget: document.getElementById("stage")
  });

  // manifest 必须在 start 时显式传入：scene.add 的 data 会被随后 start() 的空 data 覆盖
  game.registry.set("frameManifest", frameManifest);
  game.scene.add("main", MainScene, false);
  game.scene.start("main", { frameManifest });

  // 首帧渲染完成 → 开屏 100% 并淡出，而不是「加载完了还挂着 87%」
  game.events.once("ready", () => { setBoot(1); setTimeout(finishBoot, 260); });

  // 广告期间暂停 + 静音，结束恢复（pipysdk onAdStart / onAdEnd）
  bindGamePause(
    () => game.scene.pause("main"),
    () => { const s = game.scene.getScene("main"); if (s && s.isPaused) game.scene.resume("main"); },
    muteAll, unmuteAll
  );

  whenReady().then((ok) => { if (!ok) console.warn("[boot] pipysdk 未就绪，广告按钮自动隐藏"); });
  return game;
}

boot().catch(fail);
