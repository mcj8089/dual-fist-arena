// src/game/input.js — 键盘 + 触屏双输入；触摸设备由 body.pg-touch 决定是否显示屏幕控制
export function detectTouch() {
  const touch = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  document.body.classList.toggle("pg-touch", touch);
  return touch;
}

/**
 * 绑定按键 -> 语义动作，返回 Phaser 键盘对象供场景读取 isDown。
 * actions: { left:[key], right:[key], jump:[key], attack:[key], pause:[key] }
 */
export function bindKeys(scene, actions) {
  const map = {};
  for (const [name, keys] of Object.entries(actions)) {
    map[name] = keys.map((k) => scene.input.keyboard.addKey(k));
  }
  const state = { left: false, right: false, jump: false, attack: false };
  const justPressed = new Set();
  scene.events.on("update", () => {
    for (const [name, list] of Object.entries(map)) {
      const down = list.some((k) => k.isDown);
      if (down && !state[name]) justPressed.add(name);
      state[name] = down;
    }
  });
  return {
    keys: map,
    isDown: (n) => !!state[n],
    justPressed: (n) => justPressed.has(n),
    endFrame: () => justPressed.clear(),
    /** 触屏按钮注入（ui.js 的 touch 事件调用） */
    setTouch: (n, down) => { state[n] = down; if (down) justPressed.add(n); }
  };
}
