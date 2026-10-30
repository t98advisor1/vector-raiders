// 좌표평면 위에 벡터를 그리고 끌어서 조작하기 위한 작은 도구 모음.
import { parts } from "./mathtext.js";

export const NS = "http://www.w3.org/2000/svg";
export const C = {
  a: "#2563eb",
  b: "#ea580c",
  sum: "#16a34a",
  target: "#7c3aed",
  red: "#dc2626",
  pink: "#db2777",
  ink: "#1f2937",
  grid: "#e9e3d5",
  faint: "#9ca3af",
};

export const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
export const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
export const mul = (k, p) => [k * p[0], k * p[1]];
export const dot = (p, q) => p[0] * q[0] + p[1] * q[1];
export const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

export function el(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

// 글자 폭 어림값 (글꼴 크기에 대한 비율)
function charWidth(ch) {
  if (/[A-Z]/.test(ch)) return 0.68;
  if (/[a-z]/.test(ch)) return 0.52;
  if (/[0-9.]/.test(ch)) return 0.56;
  if (ch === " ") return 0.3;
  return 0.62;
}

export class Board {
  // 세계 좌표 [xmin, xmax] × [ymin, ymax]를 width 픽셀 폭의 SVG에 그린다. y는 위쪽이 +.
  constructor(container, { xmin, xmax, ymin, ymax, width = 600 }) {
    Object.assign(this, { xmin, xmax, ymin, ymax });
    this.s = width / (xmax - xmin);
    this.W = width;
    this.H = Math.round((ymax - ymin) * this.s);
    this.svg = el("svg", { viewBox: `0 0 ${this.W} ${this.H}`, class: "board" }, container);
    this.bg = el("g", {}, this.svg); // 고정 그림
    this.dyn = el("g", {}, this.svg); // 매번 다시 그리는 그림
    this.top = el("g", {}, this.svg); // 끌기 손잡이 (다시 그리지 않음)
  }

  X(x) { return (x - this.xmin) * this.s; }
  Y(y) { return (this.ymax - y) * this.s; }

  toWorld(evt) {
    const m = this.svg.getScreenCTM();
    if (!m) return [0, 0];
    const p = new DOMPoint(evt.clientX, evt.clientY).matrixTransform(m.inverse());
    return [p.x / this.s + this.xmin, this.ymax - p.y / this.s];
  }

  clear() { this.dyn.replaceChildren(); }

  grid(step = 1, layer = this.bg) {
    for (let x = Math.ceil(this.xmin / step) * step; x <= this.xmax; x += step)
      el("line", { x1: this.X(x), y1: 0, x2: this.X(x), y2: this.H, stroke: C.grid, "stroke-width": 1 }, layer);
    for (let y = Math.ceil(this.ymin / step) * step; y <= this.ymax; y += step)
      el("line", { x1: 0, y1: this.Y(y), x2: this.W, y2: this.Y(y), stroke: C.grid, "stroke-width": 1 }, layer);
  }

  line(p, q, { color = C.ink, width = 2, dash, opacity, layer = this.dyn } = {}) {
    return el("line", {
      x1: this.X(p[0]), y1: this.Y(p[1]), x2: this.X(q[0]), y2: this.Y(q[1]),
      stroke: color, "stroke-width": width, "stroke-dasharray": dash, opacity, "stroke-linecap": "round",
    }, layer);
  }

  polygon(points, { color = C.ink, width = 2, fill = "none", opacity, layer = this.dyn } = {}) {
    return el("polygon", {
      points: points.map((p) => `${this.X(p[0])},${this.Y(p[1])}`).join(" "),
      stroke: color, "stroke-width": width, fill, opacity, "stroke-linejoin": "round",
    }, layer);
  }

  circle(center, r, { color = C.ink, width = 2, fill = "none", dash, opacity, layer = this.dyn } = {}) {
    return el("circle", {
      cx: this.X(center[0]), cy: this.Y(center[1]), r: r * this.s,
      stroke: color, "stroke-width": width, fill, "stroke-dasharray": dash, opacity,
    }, layer);
  }

  arrow(p, q, { color = C.ink, width = 3, dash, label, labelSide = 1, opacity, layer = this.dyn } = {}) {
    const x1 = this.X(p[0]), y1 = this.Y(p[1]), x2 = this.X(q[0]), y2 = this.Y(q[1]);
    const g = el("g", { opacity }, layer);
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 2) return g;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const h = Math.min(9 + width * 2, len * 0.6);
    const bx = x2 - ux * h, by = y2 - uy * h;
    el("line", {
      x1, y1, x2: bx, y2: by, stroke: color, "stroke-width": width,
      "stroke-dasharray": dash, "stroke-linecap": "round",
    }, g);
    el("polygon", {
      points: `${x2},${y2} ${bx - uy * h * 0.5},${by + ux * h * 0.5} ${bx + uy * h * 0.5},${by - ux * h * 0.5}`,
      fill: color,
    }, g);
    if (label) {
      const off = 22 * labelSide;
      this.vecText((x1 + x2) / 2 + uy * off, (y1 + y2) / 2 - ux * off, label, color, g);
    }
    return g;
  }

  // 화면 좌표 (cx, cy)를 가운데로 하여 "{a}+{b}", "−[MB]" 같은 라벨을 그린다.
  vecText(cx, cy, src, color = C.ink, parent = this.dyn, size = 22) {
    const ps = parts(src).map((p) => {
      const tw = [...p.text].reduce((s, ch) => s + charWidth(ch), 0) * size;
      // 한 글자 벡터도 화살표가 잘 보이도록 최소 폭을 둔다.
      return { ...p, tw, w: p.vec ? Math.max(tw + 2, size * 0.8) : tw };
    });
    const total = ps.reduce((s, p) => s + p.w, 0);
    let x = cx - total / 2;
    const g = el("g", { class: "vlabel" }, parent);
    for (const p of ps) {
      const t = el("text", {
        x: x + (p.w - p.tw) / 2, y: cy + size * 0.36, fill: color, "font-size": size,
        "font-style": p.upright ? "normal" : "italic", "font-family": "'Times New Roman', serif",
      }, g);
      t.textContent = p.text;
      if (p.vec) {
        const ay = cy - size * 0.66;
        el("line", { x1: x + 1, y1: ay, x2: x + p.w - 4, y2: ay, stroke: color, "stroke-width": 1.8 }, g);
        el("polygon", { points: `${x + p.w},${ay} ${x + p.w - 7},${ay - 4} ${x + p.w - 7},${ay + 4}`, fill: color }, g);
      }
      x += p.w;
    }
    return g;
  }

  point(p, { color = C.ink, r = 4.5, label, dx = 12, dy = -12, size = 21, layer = this.dyn } = {}) {
    const g = el("g", {}, layer);
    el("circle", { cx: this.X(p[0]), cy: this.Y(p[1]), r, fill: color }, g);
    if (label) this.text(p, label, { color, dx, dy, size, layer: g });
    return g;
  }

  text(p, str, { color = C.ink, dx = 0, dy = 0, size = 18, weight, italic = false, layer = this.dyn } = {}) {
    const t = el("text", {
      x: this.X(p[0]) + dx, y: this.Y(p[1]) + dy, fill: color, "font-size": size, "font-weight": weight,
      "text-anchor": "middle", "dominant-baseline": "middle", "font-style": italic ? "italic" : "normal",
      "font-family": "'Times New Roman', serif", class: "vlabel",
    }, layer);
    t.textContent = str;
    return t;
  }

  // 끌 수 있는 동그라미 손잡이. 다시 그리기와 상관없이 그대로 남는다.
  handle(p, { color = C.ink, r = 16 } = {}) {
    const g = el("g", { class: "handle" }, this.top);
    el("circle", { r: r + 8, fill: "transparent" }, g); // 손가락으로 잡기 쉬운 넓은 영역
    el("circle", { r, fill: color, "fill-opacity": 0.16, stroke: color, "stroke-width": 2, "stroke-dasharray": "4 3" }, g);
    el("circle", { r: 4.5, fill: color }, g);
    const move = (q) => g.setAttribute("transform", `translate(${this.X(q[0])},${this.Y(q[1])})`);
    move(p);
    return { el: g, move };
  }

  drag(target, { onStart, onMove, onEnd } = {}) {
    target.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      target.setPointerCapture(e.pointerId);
      target.classList.add("dragging");
      onStart?.(this.toWorld(e));
      const move = (ev) => onMove?.(this.toWorld(ev));
      const up = (ev) => {
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", up);
        target.removeEventListener("pointercancel", up);
        target.classList.remove("dragging");
        onEnd?.(this.toWorld(ev));
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", up);
      target.addEventListener("pointercancel", up);
    });
  }
}

// HTML 카드를 판 위로 끌어다 놓거나 눌러서 쓰게 한다.
export function cardDrop(button, board, onDrop) {
  button.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    let ghost = null;
    const move = (ev) => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
        ghost = button.cloneNode(true);
        ghost.classList.add("ghost");
        document.body.appendChild(ghost);
      }
      if (ghost) {
        ghost.style.left = `${ev.clientX}px`;
        ghost.style.top = `${ev.clientY}px`;
      }
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (ev.type !== "pointerup") return ghost?.remove();
      if (!ghost) return onDrop();
      ghost.remove();
      const r = board.svg.getBoundingClientRect();
      if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) onDrop();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  });
  // 키보드(Enter/Space)로 누른 경우
  button.addEventListener("click", (e) => { if (e.detail === 0) onDrop(); });
}
