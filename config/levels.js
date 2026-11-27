// config/levels.js — 40 关 / 5 章 × 8 关，逐关写死（禁止 Array.from / map 生成）
// 每关一张设计卡：activeMech 本关生效机制、newMechanic 本关新增机制（练习关写 null）、
// verb 玩家新动词、family 机制族、twistAxis 唯一主推难度轴、twist 与上一关的唯一差异、
// fun 体验假设、pacing 节奏、difficulty 自报难度（与下列数值旋钮同向）。
// 数值旋钮：count 总敌人数 / waves 波数 / perWave 每波人数 / intervalMs 出场间隔（越小越急）
//          enemySpeed 敌人步速 / comboWindow 完美窗口（ms，越小越难） / arenaW 可用场地宽 / lives 容错
export const LEVELS = [
  // ---------------- 第 1 章 · 时机（教 → 练 → 反 → 混 → 收） ----------------
  {
    id: 1, chapter: 1, name: { en: "First Strike", zh: "第一拳" },
    activeMech: "timing_punch", newMechanic: "timing_punch", verb: "strike", family: "timing",
    twistAxis: "time", pacing: "teach", difficulty: 1.0,
    tutorial: true, failSafe: true, teachSteps: 3, hintKey: "hint.l01",
    twist: "对手抬手后亮起出拳提示，提示亮着的时候才打得中",
    fun: "好玩在「等」，因为早挥一拳就会被反打，忍到最后一下才爽",
    waves: 8, perWave: 1, count: 8, intervalMs: 1200, enemySpeed: 90, comboWindow: 340, arenaW: 900, lives: 3
  },
  {
    id: 2, chapter: 1, name: { en: "Two In A Row", zh: "连来两个" },
    activeMech: "timing_punch", newMechanic: null, verb: "strike", family: "aim",
    twistAxis: "count", pacing: "practice", difficulty: 1.6,
    hintKey: "hint.l02",
    twist: "对手开始在左右两侧轮换，窗口还是那套，但必须打亮起的那一边",
    fun: "好玩在「认边」，因为最大的那一拳往往打在自己的同侧手上",
    waves: 10, perWave: 1, count: 10, intervalMs: 1150, enemySpeed: 92, comboWindow: 330, arenaW: 900, lives: 3
  },
  {
    id: 3, chapter: 1, name: { en: "Close The Gap", zh: "抢身位" },
    activeMech: "dash_close", newMechanic: "dash_close", verb: "dash", family: "move",
    twistAxis: "space", pacing: "twist", difficulty: 2.2,
    hintKey: "hint.l03",
    twist: "敌人站得更远且会后退，按两下方向键可以冲刺贴身",
    fun: "好玩在「追」，因为窗口开了却够不着，只能靠冲刺把距离吃掉",
    waves: 5, perWave: 2, count: 10, intervalMs: 1100, enemySpeed: 94, comboWindow: 330, arenaW: 780, lives: 3
  },
  {
    id: 4, chapter: 1, name: { en: "Faster Feet", zh: "脚下更快" },
    activeMech: "dash_close", newMechanic: null, verb: "dash", family: "timing",
    twistAxis: "speed", pacing: "practice", difficulty: 2.6,
    hintKey: "hint.l04",
    twist: "同样的冲刺，敌人出场间隔缩短，留给你的判断时间被压缩",
    fun: "好玩在「抢」，因为两件事同时催你，冲刺的时机变成决策",
    waves: 5, perWave: 2, count: 10, intervalMs: 980, enemySpeed: 104, comboWindow: 320, arenaW: 780, lives: 3
  },
  {
    id: 5, chapter: 1, name: { en: "Low Sweep", zh: "扫腿" },
    activeMech: "jump_sweep", newMechanic: "jump_sweep", verb: "evade", family: "move",
    twistAxis: "space", pacing: "twist", difficulty: 3.0,
    hintKey: "hint.l05",
    twist: "有些敌人改成贴地扫腿，蹲下挡不住，只能跳起来躲",
    fun: "好玩在「换动作」，因为上一关刚学会蹲，现在蹲反而被打",
    waves: 6, perWave: 2, count: 12, intervalMs: 960, enemySpeed: 106, comboWindow: 320, arenaW: 700, lives: 3
  },
  {
    id: 6, chapter: 1, name: { en: "Chain The Cue", zh: "接二连三" },
    activeMech: "chain_combo", newMechanic: "chain_combo", verb: "chain", family: "timing",
    twistAxis: "time", pacing: "test", difficulty: 3.4,
    hintKey: "hint.l06",
    twist: "连续命中会点亮连击槽并逐步放宽下一次的窗口，断一次就清零",
    fun: "好玩在「连」，因为越连越宽松，越宽松越想连，断了最难受",
    waves: 6, perWave: 2, count: 12, intervalMs: 950, enemySpeed: 108, comboWindow: 280, arenaW: 700, lives: 3
  },
  {
    id: 7, chapter: 1, name: { en: "Crowded Ring", zh: "人多起来" },
    activeMech: "chain_combo", newMechanic: null, verb: "chain", family: "aim",
    twistAxis: "count", pacing: "practice", difficulty: 3.6,
    hintKey: "hint.l07",
    twist: "连击规则不变，只是场上多出四个对手，连击槽只认下一个亮窗的那个",
    fun: "好玩在「忙」，因为连击槽逼你不要断，人越多越不敢停",
    waves: 8, perWave: 2, count: 16, intervalMs: 940, enemySpeed: 108, comboWindow: 275, arenaW: 700, lives: 3
  },
  {
    id: 8, chapter: 1, name: { en: "Armored Captain", zh: "硬壳队长" },
    activeMech: "break_guard", newMechanic: "break_guard", verb: "break", family: "enemy",
    twistAxis: "enemy", pacing: "test", difficulty: 4.2,
    hintKey: "hint.l08", boss: true, bossHp: 3,
    twist: "队长第一拳打不掉血，会先吃掉你的架势，第二拳才见血",
    fun: "好玩在「拆」，因为看到窗口就出手反而白给，要读出哪一下才有用",
    waves: 8, perWave: 2, count: 16, intervalMs: 900, enemySpeed: 112, comboWindow: 270, arenaW: 700, lives: 3
  },

  // ---------------- 第 2 章 · 读招（反击 / 拆招 / 假动作） ----------------
  {
    id: 9, chapter: 2, name: { en: "Perfect Dodge", zh: "躲完就打" },
    activeMech: "counter_stagger", newMechanic: "counter_stagger", verb: "counter", family: "timing",
    twistAxis: "time", pacing: "teach", difficulty: 3.6,
    tutorial: true, teachSteps: 3, hintKey: "hint.l09",
    twist: "跳开敌人挥拳后，他会晃一下，那一下是最大的窗口",
    fun: "好玩在「换攻守」，因为躲不是躲，是把对手的破绽买下来",
    waves: 7, perWave: 2, count: 14, intervalMs: 880, enemySpeed: 112, comboWindow: 240, arenaW: 700, lives: 3
  },
  {
    id: 10, chapter: 2, name: { en: "Stagger Loop", zh: "摇晃循环" },
    activeMech: "counter_stagger", newMechanic: null, verb: "counter", family: "build",
    twistAxis: "count", pacing: "practice", difficulty: 4.0,
    hintKey: "hint.l10",
    twist: "同样的后手反击，但要连着做十八次",
    fun: "好玩在「循环」，因为躲—打—躲可以一直滚，滚顺了像跳舞",
    waves: 9, perWave: 2, count: 18, intervalMs: 870, enemySpeed: 114, comboWindow: 235, arenaW: 700, lives: 3
  },
  {
    id: 11, chapter: 2, name: { en: "Hold The Line", zh: "硬挡一下" },
    activeMech: "parry_hold", newMechanic: "parry_hold", verb: "parry", family: "rule",
    twistAxis: "resource", pacing: "twist", difficulty: 4.4,
    hintKey: "hint.l11",
    twist: "挥拳落下前一刻按下防御可以硬接并反震，但按早了一整轮没得挡",
    fun: "好玩在「险」，因为防御是免费的，但早按就废，晚按就挨",
    waves: 8, perWave: 2, count: 16, intervalMs: 860, enemySpeed: 114, comboWindow: 230, arenaW: 700, lives: 2
  },
  {
    id: 12, chapter: 2, name: { en: "Quick Hands", zh: "手快了" },
    activeMech: "parry_hold", newMechanic: null, verb: "parry", family: "timing",
    twistAxis: "speed", pacing: "practice", difficulty: 4.8,
    hintKey: "hint.l12",
    twist: "敌人出手变快，硬接的时间点被压到两百毫秒以内",
    fun: "好玩在「掐点」，因为容错变小，手指开始提前准备",
    waves: 8, perWave: 2, count: 16, intervalMs: 750, enemySpeed: 126, comboWindow: 225, arenaW: 700, lives: 2
  },
  {
    id: 13, chapter: 2, name: { en: "Feint", zh: "假动作" },
    activeMech: "feint_bait", newMechanic: "feint_bait", verb: "bait", family: "enemy",
    twistAxis: "info", pacing: "twist", difficulty: 5.2,
    hintKey: "hint.l13",
    twist: "有些亮起的提示是假的，挥手会落空，真的提示会闪两下",
    fun: "好玩在「不上当」，因为提示曾经是唯一真相，现在要先怀疑它",
    waves: 8, perWave: 2, count: 16, intervalMs: 710, enemySpeed: 130, comboWindow: 220, arenaW: 700, lives: 2
  },
  {
    id: 14, chapter: 2, name: { en: "Two Sides", zh: "左右同时" },
    activeMech: "dual_read", newMechanic: "dual_read", verb: "read", family: "aim",
    twistAxis: "enemy", pacing: "test", difficulty: 5.6,
    hintKey: "hint.l14",
    twist: "左右两个敌人同时开窗，只打对的那一边才算命中",
    fun: "好玩在「选边」，因为两个提示一样亮，判断错就白挨一拳",
    waves: 9, perWave: 2, count: 18, intervalMs: 690, enemySpeed: 132, comboWindow: 215, arenaW: 700, lives: 2
  },
  {
    id: 15, chapter: 2, name: { en: "Pincer", zh: "夹击" },
    activeMech: "dual_read", newMechanic: null, verb: "read", family: "space",
    twistAxis: "count", pacing: "practice", difficulty: 5.8,
    hintKey: "hint.l15",
    twist: "读边的规则不变，夹击的人变多，一波能来四个",
    fun: "好玩在「挤」，因为两边都有人，站位本身就是答案的一半",
    waves: 11, perWave: 2, count: 22, intervalMs: 680, enemySpeed: 132, comboWindow: 210, arenaW: 700, lives: 2
  },
  {
    id: 16, chapter: 2, name: { en: "Overhead", zh: "砸头" },
    activeMech: "crouch_tank", newMechanic: "crouch_tank", verb: "duck", family: "enemy",
    twistAxis: "time", pacing: "test", difficulty: 6.4,
    hintKey: "hint.l16", boss: true, bossHp: 4,
    twist: "重拳从上方砸下，跳起来正好送上门，只能蹲下硬吃",
    fun: "好玩在「反直觉」，因为前几关跳就是万能解，这关跳等于自杀",
    waves: 10, perWave: 2, count: 20, intervalMs: 640, enemySpeed: 136, comboWindow: 180, arenaW: 700, lives: 2
  },

  // ---------------- 第 3 章 · 武器与场地 ----------------
  {
    id: 17, chapter: 3, name: { en: "Pick It Up", zh: "捡起来" },
    activeMech: "weapon_arm", newMechanic: "weapon_arm", verb: "arm", family: "resource",
    twistAxis: "resource", pacing: "teach", difficulty: 5.8,
    tutorial: true, teachSteps: 3, hintKey: "hint.l17",
    twist: "武器掉在地上，走过去才捡得到，捡到的一拳必破防",
    fun: "好玩在「取舍」，因为去捡武器要离开最佳站位，不捡又打不动",
    waves: 9, perWave: 2, count: 18, intervalMs: 640, enemySpeed: 136, comboWindow: 180, arenaW: 760, lives: 3
  },
  {
    id: 18, chapter: 3, name: { en: "Scavenge", zh: "边打边捡" },
    activeMech: "weapon_arm", newMechanic: null, verb: "arm", family: "move",
    twistAxis: "count", pacing: "practice", difficulty: 6.2,
    hintKey: "hint.l18",
    twist: "掉落规律不变，只是人多到让每一次弯腰都有代价",
    fun: "好玩在「贪」，因为武器越攒越强，贪多就挨打",
    waves: 11, perWave: 2, count: 22, intervalMs: 630, enemySpeed: 136, comboWindow: 178, arenaW: 760, lives: 3
  },
  {
    id: 19, chapter: 3, name: { en: "Closing Walls", zh: "场地收窄" },
    activeMech: "shrinking_arena", newMechanic: "shrinking_arena", verb: "shrink", family: "space",
    twistAxis: "space", pacing: "twist", difficulty: 6.6,
    hintKey: "hint.l19",
    twist: "场地两侧的墙会慢慢往里合成一条缝，走位空间越来越小",
    fun: "好玩在「被挤」，因为你熟悉的退路一秒秒消失，只能往前打",
    waves: 11, perWave: 2, count: 22, intervalMs: 620, enemySpeed: 138, comboWindow: 176, arenaW: 660, lives: 3
  },
  {
    id: 20, chapter: 3, name: { en: "Narrow Floor", zh: "窄场快拳" },
    activeMech: "shrinking_arena", newMechanic: null, verb: "shrink", family: "timing",
    twistAxis: "speed", pacing: "practice", difficulty: 7.0,
    hintKey: "hint.l20",
    twist: "收窄的规则不变，敌人出场更快，缝里全是人",
    fun: "好玩在「堵」，因为退无可退的时候，出拳频率成了唯一变量",
    waves: 11, perWave: 2, count: 22, intervalMs: 540, enemySpeed: 148, comboWindow: 172, arenaW: 660, lives: 3
  },
  {
    id: 21, chapter: 3, name: { en: "Plate Carriers", zh: "装甲小队" },
    activeMech: "armored_swarm", newMechanic: "armored_swarm", verb: "strip", family: "enemy",
    twistAxis: "enemy", pacing: "twist", difficulty: 7.4,
    hintKey: "hint.l21",
    twist: "整队都披甲，每一拳先削甲，甲碎之后窗口才会真正张开",
    fun: "好玩在「磨」，因为伤害不再是即时反馈，要打到听见甲裂",
    waves: 8, perWave: 3, count: 24, intervalMs: 520, enemySpeed: 150, comboWindow: 170, arenaW: 660, lives: 3
  },
  {
    id: 22, chapter: 3, name: { en: "Blind Cue", zh: "关掉提示" },
    activeMech: "cue_audio_only", newMechanic: "cue_audio_only", verb: "listen", family: "rule",
    twistAxis: "info", pacing: "test", difficulty: 7.8,
    hintKey: "hint.l22",
    twist: "出拳提示不再画在屏幕上，只有一声轻响和肩膀动作",
    fun: "好玩在「听」，因为眼睛帮不上忙，身体要改去抓声音",
    waves: 8, perWave: 3, count: 24, intervalMs: 505, enemySpeed: 154, comboWindow: 168, arenaW: 660, lives: 3
  },
  {
    id: 23, chapter: 3, name: { en: "Silent Crowd", zh: "安静的乱战" },
    activeMech: "cue_audio_only", newMechanic: null, verb: "listen", family: "aim",
    twistAxis: "count", pacing: "practice", difficulty: 8.0,
    hintKey: "hint.l23",
    twist: "关提示的规则不变，人一多，那一声轻响就混在别的响里",
    fun: "好玩在「分辨」，因为声音变成稀缺资源，要先排除干扰",
    waves: 9, perWave: 3, count: 27, intervalMs: 495, enemySpeed: 154, comboWindow: 165, arenaW: 660, lives: 3
  },
  {
    id: 24, chapter: 3, name: { en: "Phase Captain", zh: "变招队长" },
    activeMech: "boss_phases", newMechanic: "boss_phases", verb: "adapt", family: "rule",
    twistAxis: "rule", pacing: "test", difficulty: 8.6,
    hintKey: "hint.l24", boss: true, bossHp: 6,
    twist: "队长每掉一段血就换一套规则：先装甲、再假动作、最后连扫",
    fun: "好玩在「重学」，因为刚摸熟的节奏被打断三次，每次都要临场改打法",
    waves: 8, perWave: 3, count: 24, intervalMs: 480, enemySpeed: 156, comboWindow: 160, arenaW: 660, lives: 3
  },

  // ---------------- 第 4 章 · 规则反转 ----------------
  {
    id: 25, chapter: 4, name: { en: "Mirror Rule", zh: "左右必须换" },
    activeMech: "mirror_fist", newMechanic: "mirror_fist", verb: "swap", family: "aim",
    twistAxis: "rule", pacing: "teach", difficulty: 8.2,
    tutorial: true, teachSteps: 3, hintKey: "hint.l25",
    twist: "连续两次打同一边会被格开，必须左右交替",
    fun: "好玩在「翻手」，因为最顺的那只手被禁用一半，节奏被迫重排",
    waves: 8, perWave: 3, count: 24, intervalMs: 480, enemySpeed: 156, comboWindow: 160, arenaW: 660, lives: 3
  },
  {
    id: 26, chapter: 4, name: { en: "Alternating", zh: "交替成瘾" },
    activeMech: "mirror_fist", newMechanic: null, verb: "swap", family: "rule",
    twistAxis: "count", pacing: "practice", difficulty: 8.5,
    hintKey: "hint.l26",
    twist: "交替规则不变，敌人多到必须一边翻手一边换目标",
    fun: "好玩在「编排」，因为左右顺序和人选一起变成一道题",
    waves: 9, perWave: 3, count: 27, intervalMs: 470, enemySpeed: 156, comboWindow: 158, arenaW: 660, lives: 3
  },
  {
    id: 27, chapter: 4, name: { en: "One Heart", zh: "一颗心" },
    activeMech: "one_hp_run", newMechanic: "one_hp_run", verb: "survive", family: "resource",
    twistAxis: "resource", pacing: "twist", difficulty: 8.7,
    hintKey: "hint.l27",
    twist: "血量只剩一击的量，任何一次漏判都直接结束",
    fun: "好玩在「绷」，因为整局只剩一次犯错机会，注意力被迫拉满",
    waves: 8, perWave: 3, count: 24, intervalMs: 460, enemySpeed: 158, comboWindow: 156, arenaW: 660, lives: 2
  },
  {
    id: 28, chapter: 4, name: { en: "Thin Ice", zh: "薄冰" },
    activeMech: "one_hp_run", newMechanic: null, verb: "survive", family: "timing",
    twistAxis: "speed", pacing: "practice", difficulty: 9.0,
    hintKey: "hint.l28",
    twist: "还是一击必死，对手出手更快，窗口更薄",
    fun: "好玩在「极限」，因为已经不能更脆弱，只能用熟练度硬顶",
    waves: 8, perWave: 3, count: 24, intervalMs: 400, enemySpeed: 172, comboWindow: 152, arenaW: 660, lives: 2
  },
  {
    id: 29, chapter: 4, name: { en: "Stamina Tax", zh: "体力税" },
    activeMech: "stamina_budget", newMechanic: "stamina_budget", verb: "ration", family: "resource",
    twistAxis: "resource", pacing: "twist", difficulty: 9.2,
    hintKey: "hint.l29",
    twist: "挥拳要花体力，挥空更贵，必须挑着打",
    fun: "好玩在「省」，因为出拳第一次有了价钱，乱挥会把自己打空",
    waves: 11, perWave: 2, count: 22, intervalMs: 390, enemySpeed: 174, comboWindow: 150, arenaW: 660, lives: 1
  },
  {
    id: 30, chapter: 4, name: { en: "Ring Out", zh: "被逼出场" },
    activeMech: "ring_out", newMechanic: "ring_out", verb: "brace", family: "space",
    twistAxis: "space", pacing: "test", difficulty: 9.5,
    hintKey: "hint.l30",
    twist: "被击退会真的往后退，退到墙根再挨一下就出场",
    fun: "好玩在「失地」，因为走位不再只是站位，而是能输的资产",
    waves: 11, perWave: 2, count: 22, intervalMs: 385, enemySpeed: 176, comboWindow: 148, arenaW: 560, lives: 1
  },
  {
    id: 31, chapter: 4, name: { en: "Bruised Ring", zh: "残场乱斗" },
    activeMech: "ring_out", newMechanic: null, verb: "brace", family: "move",
    twistAxis: "count", pacing: "practice", difficulty: 9.6,
    hintKey: "hint.l31",
    twist: "出场判定的规则不变，场上人更多，被推的机会也更多",
    fun: "好玩在「守边」，因为人一多，站位就是生存",
    waves: 13, perWave: 2, count: 26, intervalMs: 380, enemySpeed: 176, comboWindow: 145, arenaW: 560, lives: 1
  },
  {
    id: 32, chapter: 4, name: { en: "Twin Shadow", zh: "双影" },
    activeMech: "phantom_double", newMechanic: "phantom_double", verb: "discern", family: "enemy",
    twistAxis: "enemy", pacing: "test", difficulty: 9.9,
    hintKey: "hint.l32", boss: true, bossHp: 8,
    twist: "队长会分裂出一个影子同时起手，只有本体的窗口算数",
    fun: "好玩在「辨真」，因为两个提示一模一样，打错那个会被真身惩罚",
    waves: 8, perWave: 3, count: 24, intervalMs: 360, enemySpeed: 180, comboWindow: 140, arenaW: 560, lives: 1
  },

  // ---------------- 第 5 章 · 综合高压 ----------------
  {
    id: 33, chapter: 5, name: { en: "Weak Point", zh: "弱点一侧" },
    activeMech: "weak_point", newMechanic: "weak_point", verb: "aim", family: "rule",
    twistAxis: "info", pacing: "teach", difficulty: 9.6,
    tutorial: true, teachSteps: 3, hintKey: "hint.l33",
    twist: "敌人只有一侧是弱点，打另一侧等于打铁",
    fun: "好玩在「找」，因为提示亮着也可能打不动，要先看清哪边薄",
    waves: 8, perWave: 3, count: 24, intervalMs: 360, enemySpeed: 180, comboWindow: 140, arenaW: 560, lives: 1
  },
  {
    id: 34, chapter: 5, name: { en: "Many Weak Points", zh: "一片弱点" },
    activeMech: "weak_point", newMechanic: null, verb: "aim", family: "aim",
    twistAxis: "count", pacing: "practice", difficulty: 9.8,
    hintKey: "hint.l34",
    twist: "弱点规则不变，人一多就得在一片人里找那一侧",
    fun: "好玩在「扫视」，因为找弱点从单挑技巧变成场上扫描",
    waves: 9, perWave: 3, count: 27, intervalMs: 355, enemySpeed: 180, comboWindow: 138, arenaW: 560, lives: 1
  },
  {
    id: 35, chapter: 5, name: { en: "On The Beat", zh: "踩着拍子" },
    activeMech: "tempo_lock", newMechanic: "tempo_lock", verb: "rhythm", family: "timing",
    twistAxis: "time", pacing: "twist", difficulty: 9.9,
    hintKey: "hint.l35",
    twist: "提示会像心跳一样一下一下闪，只有闪的那一瞬算数",
    fun: "好玩在「对拍」，因为窗口变成脉冲，节奏感直接替代反应",
    waves: 9, perWave: 3, count: 27, intervalMs: 350, enemySpeed: 182, comboWindow: 120, arenaW: 560, lives: 1
  },
  {
    id: 36, chapter: 5, name: { en: "Fast Beat", zh: "拍子加速" },
    activeMech: "tempo_lock", newMechanic: null, verb: "rhythm", family: "build",
    twistAxis: "speed", pacing: "practice", difficulty: 10.0,
    hintKey: "hint.l36",
    twist: "脉冲规则不变，拍子越来越密，连击层数一断就掉光",
    fun: "好玩在「跟着跑」，因为拍子快了以后，脑子跟不上了只能靠手",
    waves: 9, perWave: 3, count: 27, intervalMs: 300, enemySpeed: 196, comboWindow: 118, arenaW: 560, lives: 1
  },
  {
    id: 37, chapter: 5, name: { en: "Swarm Rush", zh: "成群冲" },
    activeMech: "swarm_rush", newMechanic: "swarm_rush", verb: "hold", family: "enemy",
    twistAxis: "count", pacing: "twist", difficulty: 9.8,
    hintKey: "hint.l37",
    twist: "敌人不再一个一个上，三四个一起压过来",
    fun: "好玩在「顶住」，因为不可能全打，必须挑最靠近的那个先解决",
    waves: 12, perWave: 3, count: 36, intervalMs: 290, enemySpeed: 198, comboWindow: 116, arenaW: 560, lives: 1
  },
  {
    id: 38, chapter: 5, name: { en: "No Rest", zh: "无缝接力" },
    activeMech: "final_gauntlet", newMechanic: "final_gauntlet", verb: "endure", family: "rule",
    twistAxis: "enemy", pacing: "test", difficulty: 10.0,
    hintKey: "hint.l38",
    twist: "波次之间不再留喘息，倒下一个立刻补上一个",
    fun: "好玩在「不停」，因为节奏没有空隙，输出窗口就是唯一休息",
    waves: 12, perWave: 3, count: 36, intervalMs: 285, enemySpeed: 200, comboWindow: 114, arenaW: 560, lives: 1
  },
  {
    id: 39, chapter: 5, name: { en: "Breather", zh: "缓一口气" },
    activeMech: "swarm_rush", newMechanic: null, verb: "hold", family: "enemy",
    twistAxis: "speed", pacing: "breath", difficulty: 9.2,
    hintKey: "hint.l39",
    twist: "人还是很多，但出场慢下来、场地放宽，让你把节奏找回来",
    fun: "好玩在「回血」，因为刚被压过一轮，这一关允许你重新数拍子",
    waves: 12, perWave: 2, count: 24, intervalMs: 420, enemySpeed: 180, comboWindow: 130, arenaW: 620, lives: 1
  },
  {
    id: 40, chapter: 5, name: { en: "Last Stand", zh: "最后一战" },
    activeMech: "last_stand", newMechanic: "last_stand", verb: "survive", family: "rule",
    twistAxis: "rule", pacing: "test", difficulty: 10.0,
    hintKey: "hint.l40", boss: true, bossHp: 10,
    twist: "最终对手把所有规则叠在一起，并且你只有一条命、没有复活",
    fun: "好玩在「总账」，因为前面四十关的每一课，这最后三分钟一起结算",
    waves: 10, perWave: 3, count: 30, intervalMs: 280, enemySpeed: 210, comboWindow: 105, arenaW: 560, lives: 1
  }
];

export const LEVEL_COUNT = LEVELS.length;

/** 5 章共用同一张背景，靠 tint / 亮度出变体，不重复产图 */
export const CHAPTER_TINT = [0xffffff, 0xffd9a8, 0xbcd6ff, 0xffb9c8, 0xc9b6ff];
export const CHAPTERS = 5;
