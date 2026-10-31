// 문항 그림 엔진의 그리기 부분: figcore.js가 계산한 장면을 판(Board) 위에 그린다.
//   평면: 좌표평면 위에서 점·벡터 끝을 끌고, 조절기로 값을 바꾸며 '보기'의 값이 바로 바뀐다.
//   공간: 좌표공간을 끌어서 돌려 보고, 직선·평면·구·직육면체를 함께 본다.
// 학생이 만지기 전에는 조절기가 저절로 움직이거나(평면) 천천히 돌아간다(공간).
import { Board, C } from "./svg.js";
import { fmt } from "./mathtext.js";
import { parseFigure, evalScene, evalExpr as evalStrict, niceValue } from "./figcore.js";

// 괄호 없이 쓴 성분(3,3)도 읽는다
const evalExpr = (src, env) => { try { return evalStrict(src, env); } catch (e) { if (String(src).includes(",")) return evalStrict(`(${src})`, env); throw e; } };

const COLORS = [C.a, C.b, C.sum, C.target, C.red, C.pink];
const isVec = Array.isArray;

// 식을 화면 글자로: AB → [AB](벡터 AB), 소문자 벡터 a → {a}
function pretty(expr, env) {
  return expr
    .replace(/[A-Z]{2}(?![A-Z0-9])/g, (m) => (m in env ? m : `[${m}]`))
    .replace(/(?<![A-Za-z])([a-z])(?![a-z0-9(])/g, (m) => (isVec(env[m]) ? `{${m}}` : m))
    .replace(/\*/g, "")
    .replace(/·/g, " · ")
    .replace(/각선?\(/g, "∠(");
}

export function figureTool(spec) {
  let fig;
  try { fig = parseFigure(spec); } catch { return null; }
  if (!fig) return null;
  return (ui) => mount(ui, fig);
}

function mount(ui, fig) {
  const state = {};
  for (const s of fig.sliders) state[s.name] = s.value;
  const is3 = fig.kind === "3d";
  let env = evalScene(fig, state);

  // 판 크기: 범위가 없으면 나오는 점·벡터를 보고 정한다
  let R = 5, xr = [-1, 6], yr = [-1, 6];
  const pts = Object.values(env).filter(isVec);
  if (is3) {
    R = fig.range?.[0] ?? Math.max(3, ...pts.map((v) => Math.max(...v.map(Math.abs)))) * 1.15;
  } else if (fig.range?.length === 4) {
    xr = [fig.range[0], fig.range[1]]; yr = [fig.range[2], fig.range[3]];
  } else {
    const xs = [0, ...pts.map((v) => v[0])], ys = [0, ...pts.map((v) => v[1])];
    xr = [Math.floor(Math.min(...xs)) - 1, Math.ceil(Math.max(...xs)) + 1];
    yr = [Math.floor(Math.min(...ys)) - 1, Math.ceil(Math.max(...ys)) + 1];
    // 너무 납작하지 않게
    const w = xr[1] - xr[0], h = yr[1] - yr[0];
    if (w < h * 0.8) { const add = (h * 0.8 - w) / 2; xr = [xr[0] - add, xr[1] + add]; }
    if (h < w * 0.6) { const add = (w * 0.6 - h) / 2; yr = [yr[0] - add, yr[1] + add]; }
  }
  const bd = is3
    ? new Board(ui.board, { xmin: -R * 1.25, xmax: R * 1.25, ymin: -R * 1.05, ymax: R * 1.05, width: 320 })
    : new Board(ui.board, { xmin: xr[0], xmax: xr[1], ymin: yr[0], ymax: yr[1], width: 320 });

  // ---------- 공간: 돌려 보기 ----------
  let yaw = -0.6, pitch = 0.45;
  const proj = (p) => {
    const [x, y, z] = [p[0], p[1], p[2] ?? 0];
    const X = x * Math.cos(yaw) - y * Math.sin(yaw);
    const Y = x * Math.sin(yaw) + y * Math.cos(yaw);
    return [X, z * Math.cos(pitch) + Y * Math.sin(pitch) * 0.55];
  };
  const P = (v) => (is3 ? proj(v) : v);

  if (!is3) {
    bd.grid(1);
    if (xr[0] < 0 && xr[1] > 0) bd.line([0, yr[0]], [0, yr[1]], { color: C.faint, width: 1.2, layer: bd.bg });
    if (yr[0] < 0 && yr[1] > 0) bd.line([xr[0], 0], [xr[1], 0], { color: C.faint, width: 1.2, layer: bd.bg });
  }

  const trails = Object.fromEntries(fig.trail.map((n) => [n, []]));
  const handles = {};

  function draw() {
    env = evalScene(fig, state);
    bd.clear();
    if (is3) {
      // 좌표축과 바닥 격자
      for (let g = -Math.floor(R); g <= Math.floor(R); g++) {
        bd.line(P([g, -R, 0]), P([g, R, 0]), { color: C.grid, width: 1 });
        bd.line(P([-R, g, 0]), P([R, g, 0]), { color: C.grid, width: 1 });
      }
      for (const [axis, name] of [[[1, 0, 0], "x"], [[0, 1, 0], "y"], [[0, 0, 1], "z"]]) {
        bd.line(P(axis.map((c) => -c * R)), P(axis.map((c) => c * R)), { color: C.faint, width: 1.2 });
        bd.text(P(axis.map((c) => c * R * 1.08)), name, { color: C.faint, size: 16, italic: true });
      }
    }
    // 평면(공간)
    for (const [nE, dE] of fig.planes) {
      const n = evalExpr(nE, env), d = evalExpr(dE, env);
      const nn = n[0] ** 2 + n[1] ** 2 + n[2] ** 2;
      const f = n.map((c) => (-d * c) / nn);
      const ref = Math.abs(n[2]) < 0.9 * Math.sqrt(nn) ? [0, 0, 1] : [1, 0, 0];
      const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const unit = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
      const e1 = unit(cross(n, ref)), e2 = unit(cross(n, e1)), s = R * 0.75;
      const corner = (a, b) => f.map((c, i) => c + a * s * e1[i] + b * s * e2[i]);
      bd.polygon([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)].map(P), { color: C.target, width: 1.5, fill: "rgba(124,58,237,0.12)" });
    }
    // 구(공간)·원(평면)
    for (const [cE, rE] of [...fig.spheres, ...fig.circles]) {
      const c = evalExpr(cE, env), r = evalExpr(rE, env);
      const pc = P(c);
      bd.circle(pc, r, { color: C.sum, width: 2, fill: "rgba(22,163,74,0.08)" });
      if (is3) {
        const eq = Array.from({ length: 41 }, (_, k) => { const t = (k / 40) * 2 * Math.PI; return P([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t), c[2]]); });
        for (let k = 0; k < 40; k++) bd.line(eq[k], eq[k + 1], { color: C.sum, width: 1, dash: "3 3" });
      }
    }
    // 직육면체 모서리
    if (fig.box) for (const e of ["AB", "BC", "CD", "DA", "EF", "FG", "GH", "HE", "AE", "BF", "CG", "DH"]) bd.line(P(env[e[0]]), P(env[e[1]]), { color: C.faint, width: 1.5 });
    // 다각형·선분
    for (const poly of fig.polys) bd.polygon([...poly].map((n) => P(env[n])), { color: C.ink, width: 2, fill: "#fbf6ea" });
    for (const seg of fig.segs) bd.line(P(env[seg[0]]), P(env[seg[1]]), { color: C.ink, width: 2 });
    // 직선: 점 + t·방향
    for (const [pE, uE] of fig.lines) {
      const p0 = evalExpr(pE, env), u = evalExpr(uE, env);
      const span = (is3 ? R * 1.6 : Math.max(xr[1] - xr[0], yr[1] - yr[0])) / Math.hypot(...u);
      bd.line(P(p0.map((c, i) => c - span * u[i])), P(p0.map((c, i) => c + span * u[i])), { color: C.target, width: 1.8, dash: "6 4" });
    }
    // 자취
    for (const [name, list] of Object.entries(trails)) {
      if (isVec(env[name])) { list.push(env[name]); if (list.length > 120) list.shift(); }
      for (const q of list) bd.point(P(q), { color: C.faint, r: 2.2 });
    }
    // 화살표: 지정이 없으면 소문자 벡터 모두 (시점은 @점 또는 원점)
    const arrows = fig.arrows ?? fig.defs.map(([n]) => n).filter((n) => /^[a-z]/.test(n) && isVec(env[n]) && !fig.hide.includes(n));
    arrows.forEach((name, i) => {
      let v, start;
      if (/^[A-Z]{2}$/.test(name) && !(name in env)) { start = env[name[0]]; v = evalExpr(name, env); }
      else { v = evalExpr(name, env); start = fig.starts[name] ? evalExpr(fig.starts[name], env) : v.map(() => 0); }
      const end = start.map((c, k) => c + v[k]);
      const label = /^[A-Z]{2}$/.test(name) ? `[${name}]` : /^[a-z][0-9]*$/.test(name) ? `{${name}}` : "";
      bd.arrow(P(start), P(end), { color: COLORS[i % COLORS.length], width: 3, label });
    });
    // 점
    for (const [name] of fig.defs.filter(([n]) => /^[A-Z]/.test(n))) if (isVec(env[name]) && !fig.hide.includes(name)) bd.point(P(env[name]), { label: name, dx: 12, dy: -12, color: C.ink });
    if (fig.box) for (const n of "ABCDEFGH") bd.point(P(env[n]), { label: n, dx: 11, dy: -11, r: 3.5 });
    // 끌기 손잡이 위치
    for (const name of fig.drag) handles[name]?.move(P(tipOf(name)));
    // 보기: 값 읽기
    const rows = fig.show.map((s) => {
      let val;
      try { val = niceValue(evalExpr(s.expr, env)); } catch { val = "–"; }
      // 각·각선처럼 함수 이름이 드러나는 식은 이름표만 보여 준다. 이름표의 _는 띄어쓰기.
      const label = s.label ? s.label.replace(/_/g, " ").replace(/^([ㄱ-ㅎ])(?=\S)/, "$1 ") : "";
      const fn = /각|mid|div|cen|cos|sin/.test(s.expr);
      const deg = /^각/.test(s.expr.trim()) && val !== "–" ? "°" : "";
      const expr = label && fn ? "" : fmt(pretty(s.expr, env));
      return `<div class="fig-row">${label ? `<b>${fmt(label)}</b> ` : ""}${expr}${expr ? " " : ""}= <b class="fig-val">${val}${deg}</b></div>`;
    });
    ui.info.dataset.src = "";
    ui.info.innerHTML = rows.join("") + (fig.sliders.length ? `<div class="fig-row muted">${fig.sliders.map((s) => `${s.name} = ${niceValue(state[s.name])}`).join(" · ")}</div>` : "");
  }

  // 끄는 대상의 끝점: 점은 그 자리, 벡터는 시점 + 벡터
  function tipOf(name) {
    const v = env[name];
    if (/^[A-Z]/.test(name)) return v;
    const start = fig.starts[name] ? evalExpr(fig.starts[name], env) : v.map(() => 0);
    return start.map((c, i) => c + v[i]);
  }

  // ---------- 조작: 끌기(평면), 돌리기(공간), 조절기 ----------
  if (!is3) {
    fig.drag.forEach((name, i) => {
      const h = bd.handle(P(tipOf(name)), { color: COLORS[i % COLORS.length], r: 11 });
      handles[name] = h;
      bd.drag(h.el, {
        onMove: (w) => {
          const snap = [Math.round(w[0] * 2) / 2, Math.round(w[1] * 2) / 2];
          if (/^[A-Z]/.test(name)) state[name] = snap;
          else { const start = fig.starts[name] ? evalExpr(fig.starts[name], env) : [0, 0]; state[name] = [snap[0] - start[0], snap[1] - start[1]]; }
          draw();
        },
      });
    });
  } else {
    let last = null;
    bd.svg.style.touchAction = "none";
    bd.svg.addEventListener("pointerdown", (e) => { last = [e.clientX, e.clientY]; bd.svg.setPointerCapture?.(e.pointerId); });
    bd.svg.addEventListener("pointermove", (e) => {
      if (!last) return;
      yaw += (e.clientX - last[0]) * 0.01;
      pitch = Math.max(-0.2, Math.min(1.4, pitch + (e.clientY - last[1]) * 0.01));
      last = [e.clientX, e.clientY];
      draw();
    });
    bd.svg.addEventListener("pointerup", () => { last = null; });
  }
  const sliderEls = fig.sliders.map((s) => {
    const wrap = document.createElement("label");
    wrap.className = "slider-wrap";
    const span = document.createElement("span");
    span.textContent = s.name;
    const input = Object.assign(document.createElement("input"), { type: "range", min: s.min, max: s.max, step: s.step, value: s.value });
    input.oninput = () => { state[s.name] = Number(input.value); draw(); };
    wrap.append(span, input);
    ui.ctrl.appendChild(wrap);
    return { s, input };
  });
  if (is3) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn ghost-btn"; b.textContent = "↺ 처음 각도로";
    b.onclick = () => { yaw = -0.6; pitch = 0.45; draw(); };
    ui.ctrl.appendChild(b);
  }
  draw();

  // ---------- 저절로 움직이기: 학생이 만지면 멈춘다 ----------
  if (ui.autoplay) {
    let t = 0;
    const id = setInterval(() => {
      if (!ui.board.isConnected) return clearInterval(id);
      t++;
      if (is3) yaw += 0.03;
      const first = sliderEls[0];
      if (first) {
        const { s, input } = first;
        const span = s.max - s.min, steps = Math.max(1, Math.round(span / s.step));
        const k = t % (2 * steps), pos = k <= steps ? k : 2 * steps - k;
        state[s.name] = s.min + pos * s.step;
        input.value = state[s.name];
      }
      draw();
    }, is3 ? 90 : 450);
    const stop = () => clearInterval(id);
    for (const ev of ["pointerdown", "keydown"]) { ui.board.addEventListener(ev, stop, { once: true }); ui.ctrl.addEventListener(ev, stop, { once: true }); }
  }
}
