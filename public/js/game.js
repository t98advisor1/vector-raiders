// 유적 방탈출의 규칙: 지도, 이동·충돌, 다가가서 열 수 있는 것.
// 그리기는 world3d.js, 문제 창·HUD·서버 통신은 student.js가 맡는다. 지도 한 칸 = 3D 공간 1.
// 방 공간 대폭 확장: 기존 58×13 → 74×15. 뛰어다니고 사격하며 협력할 공간을 넓혔다.
export const W = 74, H = 15;

export const ROOMS = [
  { name: "덧셈의 방", x1: 19, tint: 0xffe2b0 },
  { name: "평행의 방", x1: 39, tint: 0xd2f0c0 },
  { name: "공간의 방", x1: 59, tint: 0xcfdcff },
  { name: "유물 제단", x1: 73, tint: 0xffdc8a },
];
export const roomAt = (x) => {
  const i = ROOMS.findIndex((r) => x < r.x1 + 1);
  return i < 0 ? ROOMS.length - 1 : i;
};

// 문 번호 → 열쇠 조각(문제), 문이 있는 세로줄
export const DOORS = { 1: ["p1", "p2", "p3"], 2: ["p4", "p5"], 3: ["p6", "p7"] };
export const DOOR_COLS = { 1: 19, 2: 39, 3: 59 };
export const DOOR_ROWS = [6, 7, 8];

// 다리 자리 → 벡터 점프(실험실 단계). (cx, cy)는 2×2 다리의 한가운데.
export const BRIDGES = {
  a: { lab: "l1", hazard: "~", title: "강 건너기", cx: 10, cy: 7 },
  b: { lab: "l2", hazard: "^", title: "절벽 건너기", cx: 25, cy: 4 },
  c: { lab: "l3", hazard: "^", title: "끊어진 다리 잇기", cx: 33, cy: 10 },
  d: { lab: "l4", hazard: "!", title: "용암 길 찾기", cx: 46, cy: 5 },
  e: { lab: "l5", hazard: "!", title: "용암 길 찾기 2", cx: 52, cy: 10 },
};

export const OBJECTS = [
  { pid: "p1", x: 5, y: 3, model: "chest", icon: "📦", name: "상자" },
  { pid: "p2", x: 5, y: 11, model: "pot", icon: "⚱️", name: "항아리" },
  { pid: "p3", x: 15, y: 7, model: "chest", icon: "📦", name: "상자" },
  { pid: "p4", x: 29, y: 11, model: "barrel", icon: "🛢️", name: "나무통" },
  { pid: "p5", x: 35, y: 3, model: "chest", icon: "📦", name: "상자" },
  { pid: "p6", x: 48, y: 3, model: "pot", icon: "⚱️", name: "항아리" },
  { pid: "p7", x: 43, y: 11, model: "chest", icon: "💰", name: "보물상자" },
];
export const ALTAR = { x: 68, y: 7 };
export const SPAWN = [2.5, 7.5];

// 로블록스풍 수직 발판: 점프로 딛고 올라갈 수 있는 블록. 값은 발판 윗면의 높이(Y).
// 0.6칸 블록은 걸어서 살짝 올라설 수 있고, 그보다 높으면 점프로 올라간다.
const PLAT_CELLS = [
  // 덧셈의 방: 기둥 블록
  ["12,2", 0.6], ["12,3", 0.6], ["15,11", 1.2],
  // 평행의 방: 계단 → 부유 디딤돌
  ["27,3", 0.6], ["28,3", 1.2], ["29,3", 1.8], ["30,2", 2.4], ["28,1", 2.4],
  // 공간의 방: 계단 → 2층 공중 발판
  ["54,12", 0.6], ["55,12", 1.2], ["56,12", 1.8], ["57,11", 2.4], ["55,10", 2.4],
  // 유물 제단 앞 전망대
  ["64,2", 0.6], ["65,2", 1.2], ["66,2", 1.8], ["67,3", 1.8],
];
export const PLATFORMS = new Map(PLAT_CELLS);

// 사격 표적(네온 수정체): 구역마다 하나, 10발을 맞히면 그 구역의 핵심 개념 카드가 열린다.
export const TARGETS = [
  { zone: "r1", concept: "p1", x: 8, y: 7 },
  { zone: "r2", concept: "p4", x: 30, y: 7 },
  { zone: "r3", concept: "p6", x: 50, y: 7 },
  { zone: "altar", concept: "p7", x: 66, y: 10 },
];

const SPEED = 4.2; // 초당 칸
const RADIUS = 0.3;
const REACH = 2.2; // 조작(열기·조사) 감지 반경: 모바일 터치에서도 확실히 닿도록 넉넉하게
const STEP = 0.65; // 땅을 딛고 있을 때 점프 없이 걸어 올라설 수 있는 발판 높이
const JUMP_VY = 5.2; // 점프 순간의 수직 속도 (최대 점프 높이 약 0.85칸)
const GRAVITY = 16.0; // 초당 낙하 가속
const BOLT_SPEED = 9; // 사격 탄환의 속도(초당 칸) — world3d.js와 짝을 이룬다
const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const ACT_KEYS = new Set(["KeyE", "Enter"]);

// 지도 글자: # 벽, . 바닥, ~ 물, ^ 절벽, ! 용암, 1~3 문, a~e 다리 자리, o 상자류, @ 제단
export function buildGrid() {
  const g = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? "#" : ".")));
  const fill = (x0, x1, y0, y1, ch) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch;
  };
  for (const [id, col] of Object.entries(DOOR_COLS)) {
    fill(col, col, 0, H - 1, "#");
    for (const r of DOOR_ROWS) g[r][col] = id;
  }
  for (const [id, br] of Object.entries(BRIDGES)) {
    const x0 = br.cx - 1, y0 = br.cy - 1;
    fill(x0, x0 + 1, 1, H - 2, br.hazard);
    fill(x0, x0 + 1, y0, y0 + 1, id);
  }
  for (const o of OBJECTS) g[o.y][o.x] = "o";
  g[ALTAR.y][ALTAR.x] = "@";
  return g;
}

export class Game {
  // hooks: isDoorOpen(id), isLabDone(lab), isSolved(pid), paused(), onInteract(target), onMove(x, y, room)
  constructor(hooks) {
    this.h = hooks;
    this.grid = buildGrid();
    this.me = { x: SPAWN[0], y: SPAWN[1], dir: [0, 1], n: null, name: "", moving: false, jumpY: 0, jumpVy: 0, air: false };
    this.touch = [0, 0]; // 가상 패드(터치) 방향: 키보드와 합쳐서 움직인다
    this.others = new Map(); // n → { x, y, tx, ty, moving, dir }
    this.names = new Map();
    this.keys = new Set();
    this.taps = new Set(); // 한 프레임 안에 눌렀다 뗀 키도 한 번은 움직이게 한다
    this.focus = null;
    this.lastSend = 0;
    this.needSend = true;
    this.activity = { dist: 0, jumps: 0, shots: 0 }; // 활동 마일리지: 이동 거리(칸)·점프·사격 횟수
    window.addEventListener("keydown", (e) => this.onKey(e, true));
    window.addEventListener("keyup", (e) => this.onKey(e, false));
    window.addEventListener("blur", () => this.keys.clear());
  }

  setMe(n, name) { this.me.n = n; this.me.name = name; }
  forceSend() { this.needSend = true; }
  setRoster(players) { this.names = new Map(players.map(([n, name]) => [n, name])); }

  setOthers(list) {
    const seen = new Set();
    for (const [n, x, y] of list) {
      if (n === this.me.n || n === null || n === undefined) continue;
      seen.add(n);
      const o = this.others.get(n);
      if (o) { o.tx = x; o.ty = y; } else this.others.set(n, { x, y, tx: x, ty: y, moving: false, dir: [0, 1] });
    }
    for (const n of [...this.others.keys()]) if (!seen.has(n)) this.others.delete(n);
  }

  onKey(e, down) {
    if (!down) { this.keys.delete(e.code); return; }
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || this.h.paused()) return;
    if (MOVE_KEYS[e.code]) { this.keys.add(e.code); this.taps.add(e.code); e.preventDefault(); }
    else if (e.code === "Space" && !e.repeat) { e.preventDefault(); this.jump(); }
    else if (e.code === "KeyG" && !e.repeat) { e.preventDefault(); this.shoot(); }
    else if (ACT_KEYS.has(e.code) && !e.repeat) {
      e.preventDefault();
      if (this.focus) this.h.onInteract(this.focus);
    }
  }

  // 스페이스바·점프 버튼: 바닥(또는 발판)에 서 있을 때만 뛴다
  jump() {
    if (this.h.paused() || this.me.air) return;
    this.me.jumpVy = JUMP_VY;
    this.me.air = true;
    this.activity.jumps++;
  }

  // G키·🎯 버튼: 전방으로 네온 벡터 탄환을 쏜다. 실제 탄환 연출은 world3d.js가 그린다.
  shoot() {
    if (this.h.paused()) return;
    this.activity.shots++;
    this.h.onShoot?.();
  }

  // 모바일 가상 패드: 눌린 방향 버튼들의 합을 정규화 없이 그대로 둔다(대각선도 2방향 합으로)
  setTouch(x, y) { this.touch = [x, y]; }
  touchInteract() { if (!this.h.paused() && this.focus) this.h.onInteract(this.focus); }
  touchShoot() { this.shoot(); }

  // 학생 화면이 5초마다 가져가 서버에 보내는 활동량. 가져가면 0으로 돌린다.
  drainActivity() {
    const a = this.activity;
    this.activity = { dist: 0, jumps: 0, shots: 0 };
    return a;
  }

  blocked(tx, ty) {
    const ch = this.grid[ty]?.[tx];
    if (ch === undefined || ch === "#" || ch === "~" || ch === "^" || ch === "!" || ch === "o" || ch === "@") return true;
    if (DOORS[ch]) return !this.h.isDoorOpen(ch);
    if (BRIDGES[ch]) return !this.h.isLabDone(BRIDGES[ch].lab);
    // 수직 발판: 공중에서는 발판 윗면보다 발이 높아야 들어갈 수 있고,
    // 땅을 딛고 있을 때는 0.6칸 블록을 걸어서 살짝 올라설 수 있다.
    const ph = PLATFORMS.get(`${tx},${ty}`);
    if (ph !== undefined && ph > this.me.jumpY + (this.me.air ? 0 : STEP)) return true;
    return false;
  }

  hits(x, y) {
    for (const [px, py] of [[x - RADIUS, y - RADIUS], [x + RADIUS, y - RADIUS], [x - RADIUS, y + RADIUS], [x + RADIUS, y + RADIUS]])
      if (this.blocked(Math.floor(px), Math.floor(py))) return true;
    return false;
  }

  // 다리·문 모서리에 걸리면 옆으로 살짝 미끄러져 통로에 줄을 맞춘다.
  // axis: 옆으로 움직일 축, push: 원래 가려던 방향의 이동량
  slide(axis, push, maxStep) {
    for (let off = 0.1; off <= 0.6; off += 0.1) {
      for (const sign of [-1, 1]) {
        const nx = axis === "x" ? this.me.x + sign * off : this.me.x + push;
        const ny = axis === "y" ? this.me.y + sign * off : this.me.y + push;
        const sx = axis === "x" ? this.me.x + sign * off : this.me.x;
        const sy = axis === "y" ? this.me.y + sign * off : this.me.y;
        if (!this.hits(nx, ny) && !this.hits(sx, sy)) {
          const d = Math.min(maxStep, off) * sign;
          if (axis === "x") this.me.x += d; else this.me.y += d;
          return true;
        }
      }
    }
    return false;
  }

  // 지금 다가가서 열 수 있는 것들
  targets() {
    const out = OBJECTS.map((o) => ({ kind: "object", id: o.pid, x: o.x + 0.5, y: o.y + 0.5, obj: o }));
    for (const br of Object.values(BRIDGES))
      if (!this.h.isLabDone(br.lab)) out.push({ kind: "bridge", id: br.lab, x: br.cx, y: br.cy, bridge: br });
    for (const [id, col] of Object.entries(DOOR_COLS))
      if (!this.h.isDoorOpen(id)) out.push({ kind: "door", id, x: col + 0.5, y: 6.5 });
    out.push({ kind: "altar", id: "altar", x: ALTAR.x + 0.5, y: ALTAR.y + 0.5 });
    return out;
  }

  promptText(f) {
    if (f.kind === "object") return this.h.isSolved(f.id) ? `E  ${f.obj.name} 다시 보기 ✓` : `E  ${f.obj.name} 열기`;
    if (f.kind === "bridge") return `E  ${f.bridge.title}: 벡터 점프!`;
    if (f.kind === "door") {
      const need = DOORS[f.id];
      return `🔒 열쇠 조각 ${need.filter((p) => this.h.isSolved(p)).length}/${need.length}`;
    }
    return "E  유물 제단 살펴보기";
  }

  // 캐릭터가 지금 서게 될 바닥 높이: 몸 주변 칸 중 오를 수 있는 발판 윗면의 최댓값
  groundUnder() {
    let g = 0;
    for (const [px, py] of [[this.me.x - RADIUS, this.me.y - RADIUS], [this.me.x + RADIUS, this.me.y - RADIUS], [this.me.x - RADIUS, this.me.y + RADIUS], [this.me.x + RADIUS, this.me.y + RADIUS]]) {
      const ph = PLATFORMS.get(`${Math.floor(px)},${Math.floor(py)}`);
      if (ph !== undefined && ph <= this.me.jumpY + (this.me.air ? 0 : STEP) && ph > g) g = ph;
    }
    return g;
  }

  update(dt, now) {
    let vx = 0, vy = 0;
    if (!this.h.paused()) {
      for (const k of new Set([...this.keys, ...this.taps])) { const d = MOVE_KEYS[k]; vx += d[0]; vy += d[1]; }
      vx += this.touch[0]; vy += this.touch[1];
    }
    // 키를 누르고 있지 않은데 톡 누른 키만 있으면, 눈에 보이도록 조금 더 움직인다.
    const step = this.keys.size === 0 && this.taps.size > 0 ? Math.max(dt, 1 / 15) : dt;
    this.taps.clear();
    const len = Math.hypot(vx, vy);
    let moved = false;
    const oldX = this.me.x, oldY = this.me.y;
    if (len > 0) {
      vx = (vx / len) * SPEED * step;
      vy = (vy / len) * SPEED * step;
      this.me.dir = [vx / (SPEED * step), vy / (SPEED * step)];
      if (!this.hits(this.me.x + vx, this.me.y)) { this.me.x += vx; moved = true; }
      else if (vy === 0) moved = this.slide("y", vx, SPEED * step) || moved;
      if (!this.hits(this.me.x, this.me.y + vy)) { this.me.y += vy; moved = true; }
      else if (vx === 0) moved = this.slide("x", vy, SPEED * step) || moved;
    }
    this.me.moving = moved;
    if (moved) this.activity.dist += Math.hypot(this.me.x - oldX, this.me.y - oldY);

    // 점프·낙하·수직 발판: 공중에서는 중력에 따르고, 발판 윗면을 아래로 지나칠 때 착지한다.
    // 발판에서 걸어 나오면 바닥이 낮아진 만큼 떨어지고, 땅을 딛고 있으면 0.6칸 블록에 살짝 올라선다.
    const ground = this.groundUnder();
    if (this.me.air || this.me.jumpY > ground + 1e-4) {
      const before = this.me.jumpY;
      this.me.jumpY += this.me.jumpVy * dt;
      this.me.jumpVy -= GRAVITY * dt;
      if (this.me.jumpVy <= 0 && before >= ground - 1e-6 && this.me.jumpY <= ground) {
        this.me.jumpY = ground;
        this.me.jumpVy = 0;
        this.me.air = false;
      }
    } else {
      this.me.jumpY = ground;
      this.me.jumpVy = 0;
      this.me.air = false;
    }
    if ((moved || this.needSend) && now - this.lastSend > 120) {
      if (this.h.onMove(this.me.x, this.me.y, roomAt(this.me.x))) this.needSend = false;
      this.lastSend = now;
    } else if (moved) {
      this.needSend = true;
    }

    let best = null, bestD = REACH;
    for (const t of this.targets()) {
      const d = Math.hypot(t.x - this.me.x, t.y - this.me.y);
      if (d < bestD) { best = t; bestD = d; }
    }
    this.focus = best;

    const k = 1 - Math.pow(0.001, dt); // 다른 친구 위치를 부드럽게 따라간다
    for (const o of this.others.values()) {
      const dx = o.tx - o.x, dy = o.ty - o.y;
      o.moving = Math.hypot(dx, dy) > 0.05;
      if (o.moving) o.dir = [dx, dy];
      o.x += dx * k;
      o.y += dy * k;
    }
  }
}
