// 유적 방탈출의 규칙: 지도, 이동·충돌, 다가가서 열 수 있는 것.
// 그리기는 world3d.js, 문제 창·HUD·서버 통신은 student.js가 맡는다. 지도 한 칸 = 3D 공간 1.
export const W = 58, H = 13;

export const ROOMS = [
  { name: "덧셈의 방", x1: 15, tint: 0xffe2b0 },
  { name: "평행의 방", x1: 31, tint: 0xd2f0c0 },
  { name: "공간의 방", x1: 47, tint: 0xcfdcff },
  { name: "유물 제단", x1: 57, tint: 0xffdc8a },
];
export const roomAt = (x) => {
  const i = ROOMS.findIndex((r) => x < r.x1 + 1);
  return i < 0 ? ROOMS.length - 1 : i;
};

// 문 번호 → 열쇠 조각(문제), 문이 있는 세로줄
export const DOORS = { 1: ["p1", "p2", "p3"], 2: ["p4", "p5"], 3: ["p6", "p7"] };
export const DOOR_COLS = { 1: 15, 2: 31, 3: 47 };
export const DOOR_ROWS = [5, 6, 7];

// 다리 자리 → 벡터 점프(실험실 단계). (cx, cy)는 2×2 다리의 한가운데.
export const BRIDGES = {
  a: { lab: "l1", hazard: "~", title: "강 건너기", cx: 10, cy: 7 },
  b: { lab: "l2", hazard: "^", title: "절벽 건너기", cx: 21, cy: 4 },
  c: { lab: "l3", hazard: "^", title: "끊어진 다리 잇기", cx: 27, cy: 9 },
  d: { lab: "l4", hazard: "!", title: "용암 길 찾기", cx: 37, cy: 5 },
  e: { lab: "l5", hazard: "!", title: "용암 길 찾기 2", cx: 43, cy: 8 },
};

export const OBJECTS = [
  { pid: "p1", x: 4, y: 3, model: "chest", icon: "📦", name: "상자" },
  { pid: "p2", x: 4, y: 9, model: "pot", icon: "⚱️", name: "항아리" },
  { pid: "p3", x: 13, y: 6, model: "chest", icon: "📦", name: "상자" },
  { pid: "p4", x: 24, y: 9, model: "barrel", icon: "🛢️", name: "나무통" },
  { pid: "p5", x: 29, y: 3, model: "chest", icon: "📦", name: "상자" },
  { pid: "p6", x: 39, y: 3, model: "pot", icon: "⚱️", name: "항아리" },
  { pid: "p7", x: 45, y: 9, model: "chest", icon: "💰", name: "보물상자" },
];
export const ALTAR = { x: 53, y: 6 };
export const SPAWN = [2.5, 6.5];

const SPEED = 4.2; // 초당 칸
const RADIUS = 0.3;
const REACH = 1.7;
const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const ACT_KEYS = new Set(["KeyE", "Space", "Enter"]);

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
    this.me = { x: SPAWN[0], y: SPAWN[1], dir: [0, 1], n: null, name: "", moving: false };
    this.others = new Map(); // n → { x, y, tx, ty, moving, dir }
    this.names = new Map();
    this.keys = new Set();
    this.taps = new Set(); // 한 프레임 안에 눌렀다 뗀 키도 한 번은 움직이게 한다
    this.focus = null;
    this.lastSend = 0;
    this.needSend = true;
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
    else if (ACT_KEYS.has(e.code) && !e.repeat) {
      e.preventDefault();
      if (this.focus) this.h.onInteract(this.focus);
    }
  }

  blocked(tx, ty) {
    const ch = this.grid[ty]?.[tx];
    if (ch === undefined || ch === "#" || ch === "~" || ch === "^" || ch === "!" || ch === "o" || ch === "@") return true;
    if (DOORS[ch]) return !this.h.isDoorOpen(ch);
    if (BRIDGES[ch]) return !this.h.isLabDone(BRIDGES[ch].lab);
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

  update(dt, now) {
    let vx = 0, vy = 0;
    if (!this.h.paused()) for (const k of new Set([...this.keys, ...this.taps])) { const d = MOVE_KEYS[k]; vx += d[0]; vy += d[1]; }
    // 키를 누르고 있지 않은데 톡 누른 키만 있으면, 눈에 보이도록 조금 더 움직인다.
    const step = this.keys.size === 0 && this.taps.size > 0 ? Math.max(dt, 1 / 15) : dt;
    this.taps.clear();
    const len = Math.hypot(vx, vy);
    let moved = false;
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
