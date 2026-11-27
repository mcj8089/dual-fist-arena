// src/game/ragdoll.js — 火柴人物理层（11 质点 + 距离约束）
// 照 references/火柴人DEMO.html 实现：Point:86-181 / Person:240-376 / ragDoll:388-427。
// 这里只有纯数学，不产生任何 arm.png / torso.png 分层素材；渲染仍是每帧一张完整独立透明 WebP。
// ragdoll 仅输出位置、朝向、倾角与姿态索引，由 game/main.js 决定播哪一帧与 setFlipX。

const GRAVITY = 5000;             // DEMO:46
const UNIT = 3.2;                 // DEMO 骨长单位 → 设计分辨率像素
const NECK = 6 * UNIT;
const ARM = 16 * UNIT;
const BODY = 22 * UNIT;
const LEG = 18 * UNIT;

class Point {
  // DEMO:86-96 默认 ay = 0；只有头/手/脚显式赋予加速度，躯干与关节点不受重力。
  // 早期版本误把默认设成 GRAVITY：11 个质点全部自由落体 + 落地完全弹性反弹，
  // 站立时整个人像弹球上下弹（实测胯部 y 跨度 559px），敌人表现为「一直跳跃」。
  constructor(x, y, ay = 0) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.ax = 0; this.ay = ay;
  }
  setV(vx, vy) { this.vx = vx; this.vy = vy; }
  // DEMO:109-113 积分 + 边界钳位。反弹改为强阻尼，避免能量在约束链里累积成弹跳。
  move(lag, groundY, sink = 0) {
    this.vx += this.ax * lag;
    this.vy += this.ay * lag;
    this.x += this.vx * lag;
    this.y += this.vy * lag;
    if (this.y > groundY + sink) {
      this.y = groundY + sink;
      this.vy *= -0.12;                    // 非弹性：落地即静止，不回弹
      this.vx *= 0.92;                    // 触地摩擦，避免脚底滑步
    }
    if (this.y < -400) { this.y = -400; this.vy *= -0.12; }
  }
  // DEMO:140-160 只修自己 / 双向均摊（均摊速度是站立稳定的关键，不能省）
  correctDistanceTo(other, d) {
    const dx = this.x - other.x, dy = this.y - other.y;
    const dist = Math.hypot(dx, dy) || 1;
    const diff = (dist - d) / dist;
    this.x -= dx * diff; this.y -= dy * diff;
  }
  correctDistanceWith(other, d) {
    const dx = this.x - other.x, dy = this.y - other.y;
    const dist = Math.hypot(dx, dy) || 1;
    const diff = (dist - d) / dist / 2;
    this.x -= dx * diff; this.y -= dy * diff;
    other.x += dx * diff; other.y += dy * diff;
    const vx = (this.vx + other.vx) * 0.5, vy = (this.vy + other.vy) * 0.5;
    this.vx = other.vx = vx; this.vy = other.vy = vy;
  }
  distanceTo(o) { return Math.hypot(this.x - o.x, this.y - o.y); }
}

const rand = (a, b) => a + Math.random() * (b - a);

export class Ragdoll {
  /** @param headX,headY 头部初始世界坐标；groundY 为地面 y */
  constructor(headX, headY, groundY, { scale = 1, spriteFootOffset = 112 } = {}) {
    this.scale = scale;                  // 帧图缩放，用于把脚底锚到同一条地平线
    this.spriteFootOffset = spriteFootOffset;  // 256px 画布：脚底 y=240、中心 y=128 → 112
    this.unit = UNIT * scale;
    const neck = NECK * scale, arm = ARM * scale, body = BODY * scale, leg = LEG * scale;
    this.neck = neck; this.arm = arm; this.body = body; this.leg = leg;
    this.groundY = groundY;
    this.sink = 0;
    this.dead = false;
    this.walkx = 0;
    this.foot = true;
    this.stepSize = 30 * scale;

    // DEMO:265 —— 11 质点：头 / 颈 / 胯 / 左右肘 / 左右膝 / 左右手 / 左右脚
    this.ph = new Point(headX, headY, -GRAVITY * 0.2);            // 头部反向浮力，站立不塌
    this.pn = new Point(headX, headY + neck);
    this.ple = new Point(this.pn.x - Math.cos(Math.PI / 6) * arm, this.pn.y + Math.sin(Math.PI / 6) * arm);
    this.pre = new Point(this.pn.x + Math.cos(Math.PI / 6) * arm, this.pn.y + Math.sin(Math.PI / 6) * arm);
    this.plh = new Point(this.ple.x - Math.cos(Math.PI / 3) * arm, this.ple.y + Math.sin(Math.PI / 3) * arm, GRAVITY * 0.05);
    this.prh = new Point(this.pre.x + Math.cos(Math.PI / 3) * arm, this.pre.y + Math.sin(Math.PI / 3) * arm, GRAVITY * 0.05);
    this.pc = new Point(this.pn.x, this.pn.y + body);
    this.plk = new Point(this.pc.x - Math.cos(Math.PI / 3) * leg, this.pc.y + Math.sin(Math.PI / 3) * leg);
    this.prk = new Point(this.pc.x + Math.cos(Math.PI / 3) * leg, this.pc.y + Math.sin(Math.PI / 3) * leg);
    this.plf = new Point(this.plk.x, this.plk.y + leg, GRAVITY);   // 只有双脚受重力
    this.prf = new Point(this.prk.x, this.prk.y + leg, GRAVITY);
    this.pArray = [this.ph, this.pn, this.pc, this.ple, this.pre, this.plk, this.prk,
                   this.plh, this.prh, this.plf, this.prf];
    // 开局就把骨架精确摆到地面：脚底 = groundY，避免出生时陷进地面再被弹出来。
    const dy = groundY - Math.max(this.plf.y, this.prf.y);
    if (Math.abs(dy) > 0.01) for (const p of this.pArray) p.y += dy;
  }

  /** DEMO:306-320 约束顺序不可调换：链式修正依赖上游已收敛 */
  solve() {
    this.ple.correctDistanceTo(this.pn, this.arm);
    this.pre.correctDistanceTo(this.pn, this.arm);
    this.plh.correctDistanceWith(this.ple, this.arm);
    this.prh.correctDistanceWith(this.pre, this.arm);
    this.plk.correctDistanceWith(this.pc, this.leg);
    this.prk.correctDistanceWith(this.pc, this.leg);
    this.plf.correctDistanceWith(this.plk, this.leg);
    this.prf.correctDistanceWith(this.prk, this.leg);
    this.pn.correctDistanceWith(this.pc, this.body);
    this.ph.correctDistanceWith(this.pn, this.neck);
    const minDis = 8;
    if (this.plh.distanceTo(this.prh) < minDis) this.plh.correctDistanceWith(this.prh, minDis);
    if (this.walkx === 0 && this.plf.distanceTo(this.prf) < minDis) this.plf.correctDistanceWith(this.prf, minDis);
  }

  /** DEMO:323-348 行走：左右脚交替钉地 */
  driveWalk() {
    const oldL = this.plf.x, oldR = this.prf.x;
    this.ple.vx = this.pre.vx = 0;
    this.plh.vx = this.prh.vx = 0;
    if (this.walkx !== 0) {
      const speed = 400 * this.unit / UNIT;
      this.pn.vx = this.walkx * speed * 0.6;
      if (this.foot) {
        this.prk.vx = this.walkx * speed; this.prf.vx = this.walkx * speed;
        this.plk.vx = this.walkx * speed * 0.2; this.plf.x = oldL;
        if (Math.abs(this.prf.x - this.plf.x) > this.stepSize) this.foot = false;
      } else {
        this.plk.vx = this.walkx * speed; this.plf.vx = this.walkx * speed;
        this.prk.vx = this.walkx * speed * 0.2; this.prf.x = oldR;
        if (Math.abs(this.plf.x - this.prf.x) > this.stepSize) this.foot = true;
      }
    } else {
      this.pn.vx = 0;
      // 站立时清掉受击冲量/停步残余速度，否则质点会带着 vx 一直滑行，骨架被慢慢拉歪
      for (const p of this.pArray) p.vx *= 0.78;
    }
  }

  step(lag) {
    lag = Math.min(lag, 1 / 30);
    if (this.dead) {
      // DEMO:388-427 瘫倒：关闭主动驱动，sink 按 (1+sink)^4 增长，躯干逐渐沉地
      for (const p of this.pArray) p.move(lag, this.groundY, this.sink);
      if (this.sink < 50) this.sink += lag * 0.08 * Math.pow(1 + this.sink, 4);
      if (this.ph.y >= this.groundY - 38) for (const p of this.pArray) p.vx *= 0.95;
      this.solve();                       // 死亡体仍保持骨长，不散架
    } else {
      for (const p of this.pArray) p.move(lag, this.groundY);
      this.solve();
      this.driveWalk();
      this.solve();
      this.anchorToGround();              // 站立必须稳定贴地，不能上下弹
    }
  }

  /** 每帧把骨架整体重锚到地面：脚底始终落在 groundY，消除长期沉降/回弹。
   *  整体平移不改变任何骨长，所以不破坏 ragdoll 约束结果。 */
  anchorToGround() {
    const dy = (this.groundY - Math.max(this.plf.y, this.prf.y)) * 0.5;
    if (Math.abs(dy) > 0.01) for (const p of this.pArray) p.y += dy;
  }

  /** 进入判定窗口时精确停步：清速度 + 平移到指定 x，避免残余惯性继续滑行或抖动 */
  halt(x = this.pc.x) {
    this.walkx = 0;
    const dx = x - this.pc.x;
    for (const p of this.pArray) { p.vx = 0; p.vy = 0; p.x += dx; }
    this.anchorToGround();
  }

  /** 渲染层唯一 y 来源：活着时脚底锁在同一地平线，死亡后才跟随 ragdoll 飞影轨迹 */
  get centerY() {
    return this.dead ? this.pc.y : this.groundY - this.spriteFootOffset * this.scale;
  }

  /** DEMO:374 武器挂点：由右手与前臂方向推出 */
  weaponAnchor() {
    return { x: this.prh.x, y: this.prh.y, dx: this.prh.x - this.pre.x, dy: this.prh.y - this.pre.y };
  }

  /** 击飞：给右手/前臂一个反向冲量，身体其余质点被约束链带动（DEMO 后坐力同理） */
  collapse(dirX, power = 620) {
    if (this.dead) return;
    this.dead = true;
    this.walkx = 0;
    for (const p of this.pArray) {
      p.ay = rand(0.10, 0.30) * GRAVITY;
      p.vx += dirX * power * rand(0.65, 1.0);
      p.vy -= rand(120, 460);
    }
    this.plh.ay = this.prh.ay = 0.05 * GRAVITY;
    this.ple.ay = this.pre.ay = 0.02 * GRAVITY;
    this.prh.vx += dirX * power * 0.7;
    this.pre.vx += dirX * power * 0.4;
  }

  /** 受击后仰但不死：只推上半身质点 */
  flinch(dirX) {
    this.ph.vx += dirX * 160;
    this.pn.vx += dirX * 120;
    this.prh.vx += dirX * 220;
    this.pre.vx += dirX * 140;
  }

  get x() { return this.pc.x; }
  get y() { return this.pc.y; }
  /** 躯干倾角（弧度），用于选 die 帧与 setRotation */
  get lean() { return Math.atan2(this.pc.x - this.pn.x, this.pn.y - this.pc.y); }
  /** 0=站立 / 1=后仰 / 2=水平飞影 / 3=贴地 */
  get poseIndex() {
    if (!this.dead) return 0;
    const a = Math.abs(this.lean);
    if (a > 1.05) return 2;
    if (this.ph.y > this.groundY - 90) return 3;
    return 1;
  }
  get disappeared() { return this.ph.y > this.groundY + 400 || this.x < -600 || this.x > 2000; }
}

export const BONE = { NECK, ARM, BODY, LEG, UNIT, GRAVITY };
