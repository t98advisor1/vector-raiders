// 유물 퀴즈: 문항은 서버가 문항 세트(content/sets/*.md)에서 읽어 보내 주고(loadSet), 정답은 서버에만 있다.
// 여기에는 확인 도구(조작 그림)와, 받은 세트를 화면에서 쓰는 모양으로 바꾸는 일만 둔다.
// 확인 도구는 관계를 보여 줄 뿐 정답 수치를 직접 보여 주지 않는다.
// 그림은 저절로 움직이는 모션으로 시작하고(ui.autoplay), 학생이 만지면 멈춘다.
import { Board, C, el, add, sub, mul, dist } from "./svg.js";
import { fmt } from "./mathtext.js";

// 2022 개정 교육과정 기하 3단원 벡터 (3-3은 문항 세트 준비 중)
export const UNITS = [
  { id: "3-1", name: "3-1. 벡터의 연산", desc: "벡터의 덧셈·뺄셈과 실수배, 위치벡터", short: "벡터의 연산", default: true },
  { id: "3-2", name: "3-2. 벡터의 성분과 내적", desc: "평면벡터의 성분과 두 벡터의 내적, 각의 크기", short: "성분과 내적" },
  { id: "3-3", name: "3-3. 도형의 방정식", desc: "직선의 방정식과 원의 방정식, 평면운동", short: "도형의 방정식", soon: true },
];

// 난이도 3가지: 하(70점) · 중(100점) · 상(150점, 교과서 응용·합답형·제시형, 3·4번 방은 2인 협업)
export const DIFFICULTY = [
  { key: "low", name: "하 · 기본", points: 70, desc: "교과서 예제·기본 문제" },
  { key: "mid", name: "중 · 표준", points: 100, desc: "교과서 본문·단원 마무리 문제" },
  { key: "high", name: "상 · 사고력", points: 150, desc: "교과서 응용·합답형·제시형 (3·4번 방은 2인 협업)" },
];

// 상자별 유물 아이콘 (상자 N번)
const RELIC_ICONS = ["🛡️", "🧭", "🪭", "⚔️", "🔱", "📦", "🪞", "🏺", "👑"];
const LEVEL_NAME = { low: "하 · 기본", mid: "중 · 표준", high: "상 · 사고력" };

// 내장 확인 도구: 문항 파일의 '그림:' 이름 → 도구 함수와 안내
export const TOOLS = {
  hex: { fn: (ui) => hexTool(ui), help: "빨간 점선 벡터의 시점(동그라미)을 끌어 꼭짓점이나 O에 놓아 보세요. 평행이동한 벡터예요." },
  square: { fn: (ui) => squareTool(ui), help: "주황 점선 벡터 $-\\VV{MB}$의 시점을 끌어 꼭짓점 B에 놓아 보세요." },
  sector: { fn: (ui) => sectorTool(ui), help: "조절기로 점 C를 움직이면 $\\VV{OC}$가 $m\\vv{a}$와 $n\\vv{b}$로 나뉘는 모습이 보여요." },
  parallel: { fn: (ui) => parallelTool(ui), help: "조절기로 m을 바꾸며 두 벡터가 평행해지는 순간을 찾아보세요." },
  collinear: { fn: (ui) => collinearTool(ui), help: "조절기로 m을 바꾸면 점 C가 움직여요. 계수의 합이 1이면 C가 직선 AB 위에 와요." },
  cuboid: { fn: (ui) => cuboidTool(ui), help: "그림을 좌우로 끌면 돌아가요. '이어 붙이기'로 벡터를 차례로 연결해 보세요." },
  circle: { fn: (ui) => circleTool(ui), help: "점 P를 끌거나 '한 바퀴 돌리기'를 누르면 Q가 지나간 자리가 남아요." },
};

// 서버가 보낸 세트 → 화면에서 쓰는 문제 목록. 다른 파일이 PROBLEMS를 그대로 쓰도록 배열 안을 바꾼다.
export const PROBLEMS = [];
export let SET = null; // { id, meta, cards, boxes }
export function loadSet(set) {
  SET = set;
  const KIND = { num: "expr", vec: "expr", choice: "choice", set: "multi" };
  PROBLEMS.length = 0;
  for (const b of set.boxes) {
    const tool = TOOLS[b.tool];
    const diffs = {};
    for (const k of ["low", "mid", "high"]) {
      const lv = b.levels[k];
      diffs[k] = {
        level: LEVEL_NAME[k] + (lv.coop ? " · 🤝 협업" : ""), points: lv.points, source: set.meta?.제목 ?? "",
        text: lv.text, hint: lv.hint, coop: !!lv.coop, conditions: lv.conditions ?? null, conditionLabels: lv.conditionLabels ?? [],
        answer: { kind: KIND[lv.kind] ?? "expr", vec: lv.kind === "vec", options: lv.options, label: lv.kind === "vec" ? "벡터식 =" : "정답 =" },
        answerText: lv.answerText ?? "",
      };
    }
    PROBLEMS.push({
      id: `p${b.no}`, no: b.no, relic: b.title, icon: RELIC_ICONS[b.no - 1] ?? "🗝️", room: b.room, coop: b.coop, concept: b.concept,
      level: diffs.mid.level, source: diffs.mid.source, text: diffs.mid.text, answer: diffs.mid.answer, hint: diffs.mid.hint,
      diffs, tool: tool?.fn ?? (() => {}), toolHelp: tool?.help ?? "", hasTool: !!tool, image: /^https?:\/\//.test(b.tool ?? "") ? b.tool : "",
    });
  }
}

// 조작 그림을 인쇄용 SVG 글자로 (자동 재생 없이 한 장면)
export function figureHtml(p) {
  if (!p.hasTool) return p.image ? `<img src="${p.image}" alt="" style="max-width:160px">` : "";
  const box = document.createElement("div");
  const dummy = document.createElement("div");
  try { p.tool({ board: box, info: dummy, ctrl: dummy, autoplay: false }); } catch { return ""; }
  return box.innerHTML;
}

// 끄는 동안 같은 문장을 매번 다시 조판하지 않도록, 바뀔 때만 고친다.
function info(ui, text) {
  if (ui.info.dataset.src === text) return;
  ui.info.dataset.src = text;
  ui.info.innerHTML = fmt(text);
}

function button(parent, text, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn ghost-btn";
  b.textContent = text;
  b.onclick = onClick;
  parent.appendChild(b);
  return b;
}

function slider(parent, { min, max, step, value, label }, onInput) {
  const wrap = document.createElement("label");
  wrap.className = "slider-wrap";
  const span = document.createElement("span");
  span.textContent = label;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.oninput = () => onInput(Number(input.value));
  wrap.append(span, input);
  parent.appendChild(wrap);
  return { input, set: (v) => { input.value = String(v); onInput(v); } };
}

// 문제 그림이 저절로 움직이는 모션: 학생이 그림이나 조절기를 만지면 멈춘다.
function autoplay(ui, stepFn, ms = 900) {
  if (!ui.autoplay) return;
  let t = 0;
  const id = setInterval(() => {
    if (!ui.board.isConnected) return clearInterval(id);
    stepFn(t++);
  }, ms);
  const stop = () => clearInterval(id);
  for (const ev of ["pointerdown", "keydown"]) {
    ui.board.addEventListener(ev, stop, { once: true });
    ui.ctrl.addEventListener(ev, stop, { once: true });
  }
}

// 1. 정육각형: [BC]를 평행이동해 같은 벡터 찾기
function hexTool(ui) {
  const r3 = Math.sqrt(3) / 2;
  const P = { O: [0, 0], A: [-0.5, r3], B: [-1, 0], C: [-0.5, -r3], D: [0.5, -r3], E: [1, 0], F: [0.5, r3] };
  const bd = new Board(ui.board, { xmin: -1.6, xmax: 1.6, ymin: -1.3, ymax: 1.3, width: 300 });
  const bg = bd.bg;
  bd.polygon([P.A, P.B, P.C, P.D, P.E, P.F], { color: C.ink, width: 2, fill: "#fbf6ea", layer: bg });
  for (const [u, v] of [["A", "D"], ["B", "E"], ["C", "F"]]) bd.line(P[u], P[v], { color: C.faint, width: 1, dash: "3 3", layer: bg });
  for (const [k, p] of Object.entries(P)) {
    const dx = p[0] === 0 ? 12 : p[0] < 0 ? -14 : 14;
    const dy = p[1] === 0 ? -12 : p[1] < 0 ? 14 : -14;
    bd.point(p, { label: k, dx, dy, layer: bg });
  }
  bd.arrow(P.B, P.C, { color: C.red, width: 3.5, label: "[BC]", labelSide: -1, layer: bg });
  const d = sub(P.C, P.B);
  const h = bd.handle(P.B, { color: C.red, r: 12 });
  const update = (p) => {
    bd.clear();
    bd.arrow(p, add(p, d), { color: C.red, width: 2.5, dash: "6 4" });
    h.move(p);
    const snap = Object.entries(P).find(([, q]) => dist(p, q) < 0.2);
    const endSnap = snap ? Object.entries(P).find(([, q]) => dist(add(snap[1], d), q) < 0.2) : null;
    if (snap && endSnap) info(ui, `시점 ${snap[0]}에 놓으면 종점은 ${endSnap[0]}이에요. $\\VV{${snap[0]}${endSnap[0]}} = \\VV{BC}$!`);
    else if (snap) info(ui, `시점 ${snap[0]}에 놓으면 종점이 꼭짓점이 아니에요.`);
    else info(ui, "시점(동그라미)을 꼭짓점이나 O에 끌어다 놓아 보세요.");
  };
  bd.drag(h.el, {
    onMove: (w) => update(Object.values(P).find((q) => dist(w, q) < 0.2) ?? w),
  });
  update(P.B);
  const tour = [P.A, P.O, P.F, P.E, P.B];
  autoplay(ui, (t) => update(tour[t % tour.length]), 1300);
}

// 2. 정사각형: −[MB]를 B에 이어 붙여 [BM]+[MN]=[BN]
function squareTool(ui) {
  const bd = new Board(ui.board, { xmin: -0.9, xmax: 4.9, ymin: -0.9, ymax: 4.9, width: 300 });
  const A = [0, 4], B = [0, 0], Cc = [4, 0], D = [4, 4], M = [0, 2], N = [2, 4];
  const bg = bd.bg;
  bd.polygon([A, B, Cc, D], { color: C.ink, width: 2, fill: "#fbf6ea", layer: bg });
  bd.point(A, { label: "A", dx: -14, dy: -12, layer: bg });
  bd.point(B, { label: "B", dx: -14, dy: 14, layer: bg });
  bd.point(Cc, { label: "C", dx: 14, dy: 14, layer: bg });
  bd.point(D, { label: "D", dx: 14, dy: -12, layer: bg });
  bd.point(M, { label: "M", dx: -16, dy: 0, layer: bg });
  bd.point(N, { label: "N", dx: 0, dy: -16, layer: bg });
  bd.arrow(M, N, { color: C.a, width: 3, label: "[MN]", layer: bg });
  bd.arrow(M, B, { color: C.b, width: 3, label: "[MB]", labelSide: -1, layer: bg });
  const neg = sub(M, B); // −MB = BM
  const start0 = [2.6, 0.8];
  const h = bd.handle(start0, { color: C.b, r: 12 });
  const update = (p) => {
    bd.clear();
    const placed = dist(p, B) < 0.5;
    const s = placed ? B : p;
    bd.arrow(s, add(s, neg), { color: C.b, width: 3, dash: "6 4", label: "-[MB]" });
    h.move(s);
    if (placed) {
      bd.arrow(B, N, { color: C.sum, width: 4, label: "[BN]", labelSide: -1 });
      info(ui, "$-\\VV{MB} = \\VV{BM}$이에요. $\\VV{BM}+\\VV{MN}=\\VV{BN}$으로 이어져요!");
    } else info(ui, "주황 점선 $-\\VV{MB}$의 시점(동그라미)을 끌어 점 B에 놓아 보세요.");
  };
  bd.drag(h.el, { onMove: update });
  update(start0);
  const path = [[2, 0.6], [1.2, 0.4], [0.5, 0.2], B, B, start0];
  autoplay(ui, (t) => update(path[t % path.length]), 900);
}

// 3. 부채꼴: [OC]를 m[a]+n[b]로 나누기
function sectorTool(ui) {
  const bd = new Board(ui.board, { xmin: -1, xmax: 7, ymin: -1, ymax: 7, width: 300 });
  const O = [0, 0], A = [6, 0], B = [0, 6];
  const bg = bd.bg;
  const arc = [O];
  for (let k = 0; k <= 30; k++) { const t = (k / 30) * (Math.PI / 2); arc.push([6 * Math.cos(t), 6 * Math.sin(t)]); }
  bd.polygon(arc, { color: C.ink, width: 2, fill: "#fbf6ea", layer: bg });
  bd.point(O, { label: "O", dx: -12, dy: 12, layer: bg });
  bd.point(A, { label: "A", dx: 12, dy: 12, layer: bg });
  bd.point(B, { label: "B", dx: -12, dy: -12, layer: bg });
  bd.arrow(O, A, { color: C.a, width: 2.5, label: "{a}", labelSide: -1, layer: bg });
  bd.arrow(O, B, { color: C.b, width: 2.5, label: "{b}", layer: bg });
  let sl;
  const setAngle = (deg) => {
    const rad = (deg * Math.PI) / 180;
    const P = [6 * Math.cos(rad), 6 * Math.sin(rad)];
    bd.clear();
    bd.line(P, [P[0], 0], { color: C.faint, width: 1.5, dash: "4 3" });
    bd.line(P, [0, P[1]], { color: C.faint, width: 1.5, dash: "4 3" });
    bd.arrow(O, [P[0], 0], { color: C.a, width: 4, opacity: 0.55 });
    bd.arrow(O, [0, P[1]], { color: C.b, width: 4, opacity: 0.55 });
    bd.arrow(O, P, { color: C.red, width: 3.5, label: "[OC]" });
    bd.point(P, { label: "C", dx: 12, dy: -12, color: C.red });
    const m = Math.cos(rad).toFixed(2), n = Math.sin(rad).toFixed(2);
    info(ui, `$\\angle\\mathrm{AOC} = ${deg}^\\circ$일 때 $\\VV{OC} \\approx ${m}\\vv{a} + ${n}\\vv{b}$예요.`);
  };
  sl = slider(ui.ctrl, { min: 10, max: 80, step: 5, value: 30, label: "∠AOC" }, setAngle);
  setAngle(30);
  autoplay(ui, (t) => sl.set(10 + ((t * 5) % 75)), 500);
}

// 4. 평행 조건: [q]−[r]가 [p]+[q] 방향과 평행해지는 m
function parallelTool(ui) {
  const bd = new Board(ui.board, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 300 });
  bd.grid(1);
  const dir = [1, -2]; // p+q = a − 2b (a=(1,0), b=(0,1)로 놓고 그린다)
  bd.line(mul(-2.4, dir), mul(2.4, dir), { color: C.target, width: 1.5, dash: "5 4", layer: bd.bg });
  bd.arrow([0, 0], dir, { color: C.target, width: 3, label: "{p}+{q}", layer: bd.bg });
  let sl;
  const setM = (m) => {
    const v = [-1 - m, 4];
    bd.clear();
    const par = Math.abs(v[0] * dir[1] - v[1] * dir[0]) < 1e-9;
    bd.arrow([0, 0], v, { color: par ? C.sum : C.red, width: 3.5, label: "{q}-{r}" });
    if (par) info(ui, `<b>m = ${m}</b>일 때 $\\vv{q}-\\vv{r}$가 보라색 점선과 평행해요!`);
    else info(ui, `m = ${m}: $\\vv{q}-\\vv{r} = (${-1 - m})\\vv{a} + 4\\vv{b}$`);
  };
  sl = slider(ui.ctrl, { min: -2, max: 3, step: 0.5, value: 0, label: "m" }, setM);
  setM(0);
  const seq = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3];
  autoplay(ui, (t) => sl.set(seq[t % seq.length]), 700);
}

// 5. 일직선 조건: 계수의 합이 1이면 C가 직선 AB 위에
function collinearTool(ui) {
  const bd = new Board(ui.board, { xmin: -7, xmax: 4, ymin: -1, ymax: 8, width: 300 });
  bd.grid(1);
  const O = [0, 0], A = [1, 1], B = [2, 0]; // [OA]=a, [OB]=b
  const bg = bd.bg;
  bd.line([-6, 8], [3, -1], { color: C.faint, width: 1.5, dash: "5 4", layer: bg });
  bd.point(O, { label: "O", dx: -12, dy: 12, layer: bg });
  bd.arrow(O, A, { color: C.a, width: 2.5, label: "{a}", layer: bg });
  bd.arrow(O, B, { color: C.b, width: 2.5, label: "{b}", labelSide: -1, layer: bg });
  bd.point(A, { label: "A", dx: 12, dy: -12, layer: bg });
  bd.point(B, { label: "B", dx: 12, dy: 12, layer: bg });
  const trail = [];
  let sl;
  const setM = (m) => {
    const P = add(mul(2 * m, A), mul(m - 5, B));
    trail.push(P);
    bd.clear();
    for (const q of trail.slice(-20)) bd.point(q, { color: C.faint, r: 2.5 });
    const on = Math.abs(3 * m - 5 - 1) < 1e-9;
    bd.arrow(O, P, { color: on ? C.sum : C.red, width: 3, label: "[OC]" });
    bd.point(P, { label: "C", dx: 12, dy: -12, color: on ? C.sum : C.red });
    if (on) info(ui, `<b>m = ${m}</b>일 때 계수의 합 $2m + (m-5) = 1$이 되어 점 C가 직선 AB 위에 와요!`);
    else info(ui, `m = ${m}: 계수의 합 $2m+(m-5) = ${3 * m - 5}$예요. 1이 되면 C가 직선 AB 위에 와요.`);
  };
  sl = slider(ui.ctrl, { min: 1, max: 3, step: 0.25, value: 1, label: "m" }, setM);
  setM(1);
  autoplay(ui, (t) => sl.set(1 + ((t % 9) * 0.25)), 650);
}

// 6. 직육면체: 네 대각선 벡터를 이어 붙이면 −4[GC]
function cuboidTool(ui) {
  const bd = new Board(ui.board, { xmin: -2.5, xmax: 4.5, ymin: -1.5, ymax: 4, width: 300 });
  const Q = { A: [0, 0, 2], B: [3, 0, 2], C: [3, 2, 2], D: [0, 2, 2], E: [0, 0, 0], F: [3, 0, 0], G: [3, 2, 0], H: [0, 2, 0] };
  const v3 = (s) => Q[s[1]].map((x, i) => x - Q[s[0]][i]);
  const plus3 = (p, v) => p.map((x, i) => x + v[i]);
  const EDGES = ["AB", "BC", "CD", "DA", "EF", "FG", "GH", "HE", "AE", "BF", "CG", "DH"];
  const VECS = [["AG", C.a], ["BH", C.b], ["CE", C.sum], ["DF", C.target]];
  let th = 0.5, chain = 0;
  const proj = ([x, y, z]) => {
    const cx = x - 1.5, cy = y - 1;
    const u = cx * Math.cos(th) - cy * Math.sin(th);
    const w = cx * Math.sin(th) + cy * Math.cos(th);
    return [u + 0.8, z + 0.35 * w + 0.2];
  };
  const draw = () => {
    bd.clear();
    for (const e of EDGES) bd.line(proj(Q[e[0]]), proj(Q[e[1]]), { color: C.faint, width: 1.5 });
    for (const [k, p] of Object.entries(Q)) bd.point(proj(p), { label: k, dx: 10, dy: -10, r: 3 });
    if (!chain) for (const [v, col] of VECS) bd.arrow(proj(Q[v[0]]), proj(Q[v[1]]), { color: col, width: 2.5 });
    else {
      let p = Q.A;
      VECS.slice(0, chain).forEach(([v, col]) => { const q = plus3(p, v3(v)); bd.arrow(proj(p), proj(q), { color: col, width: 3 }); p = q; });
      if (chain === 4) {
        bd.arrow(proj(Q.A), proj(p), { color: C.red, width: 4, label: "-4[GC]" });
        info(ui, "네 벡터를 이어 붙이면 가로·세로는 지워지고 높이만 남아요: $\\VV{AG}+\\VV{BH}+\\VV{CE}+\\VV{DF}=-4\\VV{GC}$");
      } else info(ui, `${chain}개째 이어 붙였어요. 앞 벡터의 화살촉에 다음 벡터의 시점을 붙여요.`);
    }
    if (!chain) info(ui, "그림을 좌우로 끌면 돌아가요. '이어 붙이기'를 눌러 보세요.");
  };
  let last = null;
  bd.svg.addEventListener("pointerdown", (e) => { last = e.clientX; bd.svg.setPointerCapture(e.pointerId); });
  bd.svg.addEventListener("pointermove", (e) => { if (last === null) return; th += (e.clientX - last) * 0.01; last = e.clientX; draw(); });
  bd.svg.addEventListener("pointerup", () => { last = null; });
  button(ui.ctrl, "🔗 이어 붙이기", () => { chain = chain >= 4 ? 0 : chain + 1; draw(); });
  draw();
  autoplay(ui, (t) => { chain = t % 6 > 4 ? 0 : t % 6; th += 0.15; draw(); }, 1000);
}

// 7. 원과 단위 벡터: P가 원 위를 돌 때 Q = [OP]/|[OP]|의 자취
function circleTool(ui) {
  const bd = new Board(ui.board, { xmin: -1, xmax: 5, ymin: -1, ymax: 5, width: 300 });
  bd.grid(1);
  const O = [0, 0], Ce = [2, 2], R = 2;
  const bg = bd.bg;
  bd.circle(Ce, R, { color: C.ink, width: 2, fill: "#fbf6ea", layer: bg });
  bd.circle(O, 1, { color: C.faint, width: 1.5, dash: "4 3", layer: bg });
  bd.point(O, { label: "O", dx: -12, dy: 12, layer: bg });
  bd.point(Ce, { label: "(2, 2)", dx: 0, dy: 16, layer: bg });
  const trail = [];
  const h = bd.handle([4, 2], { color: C.a, r: 12 });
  const setT = (t) => {
    const P = [Ce[0] + R * Math.cos(t), Ce[1] + R * Math.sin(t)];
    const len = Math.hypot(P[0], P[1]);
    const Qp = [P[0] / len, P[1] / len];
    trail.push(Qp);
    bd.clear();
    for (const q of trail.slice(-80)) bd.point(q, { color: C.sum, r: 2 });
    bd.arrow(O, P, { color: C.a, width: 2, opacity: 0.7, label: "[OP]" });
    bd.arrow(O, Qp, { color: C.red, width: 3.5 });
    bd.point(Qp, { label: "Q", dx: -12, dy: -10, color: C.red });
    h.move(P);
    const ang = Math.round((Math.atan2(Qp[1], Qp[0]) * 180) / Math.PI);
    info(ui, `Q는 반지름 1인 원 위에 있어요. 지금 $\\angle$ = ${ang}°. Q가 지나간 자리(초록 점)는 0°~90°의 호예요.`);
  };
  bd.drag(h.el, { onMove: (w) => setT(Math.atan2(w[1] - Ce[1], w[0] - Ce[0])) });
  let tt = 0;
  button(ui.ctrl, "🔄 한 바퀴 돌리기", () => {
    let k = 0;
    const id = setInterval(() => { if (!ui.board.isConnected || k++ > 72) return clearInterval(id); tt += Math.PI / 36; setT(tt); }, 40);
  });
  setT(0);
  autoplay(ui, () => { tt += Math.PI / 12; setT(tt); }, 260);
}
