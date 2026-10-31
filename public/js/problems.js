// 유물 퀴즈: 미래엔 기하 Ⅲ-1 '벡터의 연산' 중단원 마무리 문제를 바탕으로 숫자·조건을 바꾼 유사 문제.
// 정답은 서버(src/answers.js)에만 있다. 여기에는 문제, 힌트, 확인 도구만 둔다.
// 확인 도구는 관계를 보여 줄 뿐 정답 수치를 직접 보여 주지 않는다.
// 모든 문제는 문장이 타자 소리와 함께 찍히고, 그림이 저절로 움직이는 모션 그래픽으로 시작한다(ui.autoplay).
// 학생이 그림이나 슬라이더를 만지면 자동 재생이 멈추고 직접 조작한다.
import { Board, C, el, add, sub, mul, dist } from "./svg.js";
import { fmt } from "./mathtext.js";

// 난이도 선택: 상자를 열 때 학생이 고른다. 배점은 서버(src/room.js의 DIFF_POINTS)와 짝을 이룬다.
export const DIFFICULTY = [
  { key: "high", name: "상", points: 150, desc: "도전! 스스로 풀이를 찾아요" },
  { key: "mid", name: "중", points: 100, desc: "기본! 보통 수업 문제예요" },
  { key: "low", name: "하", points: 70, desc: "차근차근 풀어요" },
];

export const PROBLEMS = [
  {
    id: "p1", relic: "육각 방패", icon: "🛡️", level: "기본", source: "중단원 01번 유사",
    text: "오른쪽 그림과 같은 정육각형 ABCDEF에서 세 대각선 AD, BE, CF의 교점을 O라 할 때, 벡터 [BC]와 같은 벡터를 보기에서 모두 고르시오.",
    answer: { kind: "multi", options: ["AO", "CO", "DE", "FE", "OD", "EF", "BO"] },
    toolHelp: "빨간 점선 벡터의 시점(동그라미)을 끌어 꼭짓점이나 O에 놓아 보세요. [BC]를 평행이동한 벡터예요.",
    hint: "같은 벡터는 크기와 방향이 같아요. [BC]를 평행이동했을 때 시점과 종점이 모두 꼭짓점(또는 O)에 놓이는 경우를 찾아보세요.",
    tool: hexTool,
  },
  {
    id: "p2", relic: "사각 나침반", icon: "🧭", level: "표준", source: "중단원 07번 유사",
    text: "오른쪽 정사각형 ABCD에서 변 AB의 중점을 M, 변 AD의 중점을 N이라 하자. $|\\VV{MN}-\\VV{MB}|=2\\sqrt{5}$일 때, 이 정사각형의 한 변의 길이를 구하시오.",
    answer: { kind: "expr", label: "한 변의 길이 =" },
    toolHelp: "주황 점선 벡터 $-\\VV{MB}$의 시점을 끌어 꼭짓점 B에 놓아 보세요.",
    hint: "$\\VV{MN}-\\VV{MB}=\\VV{MN}+\\VV{BM}=\\VV{BM}+\\VV{MN}$이에요. 이어 붙이면 어떤 벡터가 되는지 보고, 한 변의 길이를 $a$로 놓고 그 크기를 구해 보세요.",
    tool: squareTool,
  },
  {
    id: "p3", relic: "부채꼴 부채", icon: "🪭", level: "표준", source: "중단원 08번 유사",
    text: "반지름의 길이가 $6$이고 중심각의 크기가 $90^\\circ$인 부채꼴 OAB의 호 AB 위의 점 C에 대하여 $\\VV{OA}=\\vv{a}$, $\\VV{OB}=\\vv{b}$, $\\VV{OC}=m\\vv{a}+n\\vv{b}$라 하자. $\\angle\\mathrm{AOC}=30^\\circ$일 때, 두 실수 $m$, $n$에 대하여 $m^2-n^2$의 값을 구하시오.",
    answer: { kind: "expr", label: "m² − n² =" },
    toolHelp: "점 C를 호 위에서 움직이면 $\\VV{OC}$가 $m\\vv{a}$와 $n\\vv{b}$로 나뉘는 모습이 보여요.",
    hint: "C에서 OA, OB에 수선을 내리면 직각삼각형이 생겨요. $|m\\vv{a}|=6m$, $|n\\vv{b}|=6n$이 각각 $6\\cos 30^\\circ$, $6\\sin 30^\\circ$와 같아요.",
    tool: sectorTool,
  },
  {
    id: "p4", relic: "평행 쌍검", icon: "⚔️", level: "표준", source: "중단원 10번 유사",
    text: "영벡터가 아니고 서로 평행하지 않은 두 벡터 $\\vv{a}$, $\\vv{b}$에 대하여 $\\vv{p}=2\\vv{a}-3\\vv{b}$, $\\vv{q}=-\\vv{a}+\\vv{b}$, $\\vv{r}=m\\vv{a}-3\\vv{b}$일 때, 두 벡터 $\\vv{p}+\\vv{q}$와 $\\vv{q}-\\vv{r}$가 서로 평행하도록 하는 실수 $m$의 값을 구하시오.",
    answer: { kind: "expr", label: "m =" },
    toolHelp: "슬라이더로 $m$을 바꾸면 $\\vv{q}-\\vv{r}$가 움직여요. 보라색 점선은 $\\vv{p}+\\vv{q}$의 방향이에요.",
    hint: "$\\vv{p}+\\vv{q}$와 $\\vv{q}-\\vv{r}$를 각각 $\\vv{a}$, $\\vv{b}$로 정리한 뒤, $\\vv{q}-\\vv{r}=k(\\vv{p}+\\vv{q})$로 놓고 $\\vv{a}$, $\\vv{b}$의 계수를 비교해 보세요.",
    tool: parallelTool,
  },
  {
    id: "p5", relic: "일직선 창", icon: "🔱", level: "표준", source: "중단원 11번 유사",
    text: "평면 위의 서로 다른 네 점 O, A, B, C에 대하여 $\\VV{OA}=\\vv{a}$, $\\VV{OB}=\\vv{b}$, $\\VV{OC}=2m\\vv{a}+(m-5)\\vv{b}$일 때, 세 점 A, B, C가 한 직선 위에 있도록 하는 실수 $m$의 값을 구하시오. (단, $\\vv{a}$와 $\\vv{b}$는 영벡터가 아니고 서로 평행하지 않다.)",
    answer: { kind: "expr", label: "m =" },
    toolHelp: "슬라이더로 $m$을 바꾸면 점 C가 움직이고, 지나간 자리가 점으로 남아요.",
    hint: "$\\VV{AC}=t\\VV{AB}$인 실수 $t$가 있어야 해요. 그러면 $\\VV{OC}=(1-t)\\vv{a}+t\\vv{b}$이므로 $\\vv{a}$, $\\vv{b}$의 계수의 합은 얼마일까요?",
    tool: collinearTool,
  },
  {
    id: "p6", relic: "정육면체 상자", icon: "📦", level: "발전", source: "중단원 13번 유사",
    text: "다음 그림과 같은 직육면체 ABCD-EFGH에서 $\\VV{AG}+\\VV{BH}+\\VV{CE}+\\VV{DF}=m\\VV{GC}$를 만족시키는 실수 $m$의 값을 구하시오.",
    answer: { kind: "expr", label: "m =" },
    toolHelp: "그림을 끌면 돌아가요. '이어 붙이기'를 누르면 네 벡터를 화살촉에 시점을 이어 차례로 연결해요.",
    hint: "네 벡터를 가로, 세로, 높이 방향으로 나누어 보세요. 가로·세로 방향은 서로 지워지고 높이 방향만 남아요. [GC]의 방향(위? 아래?)에 주의하세요.",
    tool: cuboidTool,
  },
  {
    id: "p7", relic: "원형 거울", icon: "🪞", level: "발전", source: "중단원 15번 유사",
    text: "원 $(x-2)^2+(y-2)^2=4$ 위를 움직이는 점 P에 대하여 $\\VV{OQ}=\\dfrac{\\VV{OP}}{|\\VV{OP}|}$를 만족시키는 점 Q가 나타내는 도형의 길이를 구하시오. (단, O는 원점)",
    answer: { kind: "expr", label: "길이 =" },
    toolHelp: "점 P를 끌거나 '한 바퀴 돌리기'를 누르면 Q가 지나간 자리가 남아요.",
    hint: "Q는 원점에서 P 쪽으로 거리 1인 점이에요. 원점에서 원에 그은 두 접선 사이의 각을 구하면 Q가 움직이는 호의 중심각이 돼요.",
    tool: circleTool,
  },
];

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
  wrap.className = "slider";
  const name = document.createElement("span");
  const input = document.createElement("input");
  Object.assign(input, { type: "range", min, max, step, value });
  const show = () => { name.innerHTML = fmt(`${label} = ${String(input.value).replace("-", "−")}`); };
  input.oninput = () => { show(); onInput(Number(input.value)); };
  show();
  wrap.append(name, input);
  parent.appendChild(wrap);
  return input;
}

// p1: 정육각형에서 [BC] 평행이동
function hexTool(ui) {
  const bd = new Board(ui.board, { xmin: -1.8, xmax: 2.4, ymin: -1.5, ymax: 1.4, width: 560 });
  const r3 = Math.sqrt(3) / 2;
  const V = { A: [-0.5, r3], B: [-1, 0], C: [-0.5, -r3], D: [0.5, -r3], E: [1, 0], F: [0.5, r3], O: [0, 0] };
  bd.polygon(["A", "B", "C", "D", "E", "F"].map((k) => V[k]), { width: 2.5, layer: bd.bg });
  for (const [p, q] of [["A", "D"], ["B", "E"], ["C", "F"]]) bd.line(V[p], V[q], { color: C.faint, width: 1.5, layer: bd.bg });
  for (const [k, p] of Object.entries(V)) {
    const [dx, dy] = k === "O" ? [16, 18] : [p[0] * 28, -p[1] * 28];
    bd.point(p, { label: k, dx, dy, layer: bd.bg });
  }
  const BC = sub(V.C, V.B);
  bd.arrow(V.B, V.C, { color: C.red, width: 4, layer: bd.bg });

  let tail = [1.7, 1.0], grab = [0, 0];
  const h = bd.handle(tail, { color: C.red });
  const keys = Object.keys(V);
  const render = () => {
    bd.clear();
    const head = add(tail, BC);
    bd.arrow(tail, head, { color: C.red, width: 3, dash: "7 5" });
    h.move(tail);
    const from = keys.find((k) => dist(V[k], tail) < 1e-9);
    const to = keys.find((k) => dist(V[k], head) < 1e-6);
    if (!from) info(ui, "시점을 꼭짓점이나 O 가까이에 놓으면 딱 붙어요.");
    else if (to) info(ui, `시점 ${from} → 종점 ${to} : [BC]를 평행이동한 벡터는 [${from}${to}]예요.`);
    else info(ui, `시점 ${from} : 종점이 꼭짓점이나 O에 오지 않아요.`);
  };
  bd.drag(h.el, {
    onStart: (w) => { grab = sub(w, tail); },
    onMove: (w) => {
      const t = sub(w, grab);
      const k = keys.find((key) => dist(V[key], t) < 0.2);
      tail = k ? V[k].slice() : t;
      render();
    },
  });
  if (ui.autoplay) {
    const path = [tail.slice(), V.A, V.F, V.O, V.E, tail.slice()];
    autoplay(bd, (t) => { tail = tour(path, t, 0.9, 1.1); render(); });
  }
  render();
}

// p2: 정사각형에서 [MN] − [MB] = [BM] + [MN]
function squareTool(ui) {
  const bd = new Board(ui.board, { xmin: -1.3, xmax: 8, ymin: -1, ymax: 5.3, width: 560 });
  const A = [0, 4], B = [0, 0], Cc = [4, 0], D = [4, 4], M = [0, 2], N = [2, 4];
  bd.polygon([A, B, Cc, D], { width: 2.5, layer: bd.bg });
  for (const [k, p, dx, dy] of [["A", A, -14, -12], ["B", B, -14, 14], ["C", Cc, 14, 14], ["D", D, 14, -12], ["M", M, -18, 0], ["N", N, 0, -16]])
    bd.point(p, { label: k, dx, dy, layer: bd.bg });
  bd.arrow(M, N, { color: C.a, width: 3.5, label: "[MN]", labelSide: -1, layer: bd.bg });
  bd.arrow(M, B, { color: C.b, width: 3.5, label: "[MB]", labelSide: -1, layer: bd.bg });

  const BM = sub(M, B);
  let tail = [6.2, 0.7], grab = [0, 0], snapped = false;
  const h = bd.handle(tail, { color: C.b });
  const render = () => {
    bd.clear();
    if (snapped) bd.arrow(B, N, { color: C.sum, width: 4.5, label: "[BN]", labelSide: -1 });
    bd.arrow(tail, add(tail, BM), { color: C.b, width: 3, dash: "7 5", label: "−[MB]", labelSide: snapped ? 1 : -1 });
    h.move(tail);
    info(ui, snapped
      ? "$-\\VV{MB}=\\VV{BM}$을 $\\VV{MN}$ 앞에 이었더니 $\\VV{BM}+\\VV{MN}=\\VV{BN}$이 되었어요. 그러면 $|\\VV{MN}-\\VV{MB}|=|\\VV{BN}|$이에요."
      : "$-\\VV{MB}$는 $\\VV{MB}$와 크기는 같고 방향은 반대인 벡터, 즉 $\\VV{BM}$이에요.");
  };
  bd.drag(h.el, {
    onStart: (w) => { grab = sub(w, tail); },
    onMove: (w) => {
      const t = sub(w, grab);
      snapped = dist(t, B) < 0.5;
      tail = snapped ? B.slice() : t;
      render();
    },
  });
  if (ui.autoplay) {
    const path = [tail.slice(), B];
    autoplay(bd, (t) => { tail = tour(path, t, 1.4, 2.2); snapped = dist(tail, B) < 1e-9; render(); });
  }
  render();
}

// p3: 부채꼴에서 [OC] = m{a} + n{b} 분해
function sectorTool(ui) {
  const R = 6;
  const bd = new Board(ui.board, { xmin: -1.3, xmax: 7.6, ymin: -1.3, ymax: 7.3, width: 520 });
  el("path", {
    d: `M ${bd.X(R)} ${bd.Y(0)} A ${R * bd.s} ${R * bd.s} 0 0 0 ${bd.X(0)} ${bd.Y(R)}`,
    fill: "none", stroke: C.ink, "stroke-width": 2.5,
  }, bd.bg);
  bd.line([0, 0], [R, 0], { width: 2.5, layer: bd.bg });
  bd.line([0, 0], [0, R], { width: 2.5, layer: bd.bg });
  bd.arrow([0, 0], [R, 0], { color: C.a, width: 2.5, label: "{a}", labelSide: 1, opacity: 0.6, layer: bd.bg });
  bd.arrow([0, 0], [0, R], { color: C.b, width: 2.5, label: "{b}", labelSide: 1, opacity: 0.6, layer: bd.bg });
  bd.point([0, 0], { label: "O", dx: -14, dy: 14, layer: bd.bg });
  bd.point([R, 0], { label: "A", dx: 10, dy: 16, layer: bd.bg });
  bd.point([0, R], { label: "B", dx: -16, dy: -4, layer: bd.bg });

  let deg = 50, playing = false;
  const h = bd.handle([R, 0], { color: C.sum });
  const render = () => {
    bd.clear();
    const t = (deg * Math.PI) / 180;
    const P = [R * Math.cos(t), R * Math.sin(t)];
    bd.line(P, [P[0], 0], { color: C.faint, width: 1.5, dash: "5 5" });
    bd.line(P, [0, P[1]], { color: C.faint, width: 1.5, dash: "5 5" });
    bd.arrow([0, 0], [P[0], 0], { color: C.a, width: 6, opacity: 0.55, label: "m{a}", labelSide: -1 });
    bd.arrow([0, 0], [0, P[1]], { color: C.b, width: 6, opacity: 0.55, label: "n{b}", labelSide: -1.4 });
    bd.arrow([0, 0], P, { color: C.sum, width: 3.5 });
    el("path", {
      d: `M ${bd.X(1.1)} ${bd.Y(0)} A ${1.1 * bd.s} ${1.1 * bd.s} 0 0 0 ${bd.X(1.1 * Math.cos(t))} ${bd.Y(1.1 * Math.sin(t))}`,
      fill: "none", stroke: C.ink, "stroke-width": 1.5,
    }, bd.dyn);
    bd.text([1.7 * Math.cos(t / 2), 1.7 * Math.sin(t / 2)], `${Math.round(deg)}°`, { size: 15 });
    bd.point(P, { label: "C", dx: 14, dy: -12 });
    h.move(P);
    // 움직이는 동안에는 수식을 매 프레임 다시 조판하지 않도록 글로만 안내한다.
    info(ui, playing ? "🎬 점 C가 호를 따라 움직이면 m, n이 어떻게 바뀌는지 보세요. 점 C를 잡으면 멈춰요." : `$\\angle\\mathrm{AOC}=${deg}^\\circ$`);
  };
  if (ui.autoplay) {
    playing = true;
    autoplay(bd, (t) => { deg = 45 + 40 * Math.sin(t * 1.1); render(); }, () => {
      playing = false;
      deg = Math.round(deg / 5) * 5;
      render();
    });
  }
  bd.drag(h.el, {
    onMove: (w) => {
      const d = (Math.atan2(w[1], w[0]) * 180) / Math.PI;
      deg = Math.max(0, Math.min(90, Math.round(d / 5) * 5));
      render();
    },
  });
  render();
}

// p4: m을 바꾸며 {q} − {r}와 {p} + {q}가 평행해지는지 보기
function parallelTool(ui) {
  const a = [1.6, 0.3], b = [0.5, 1.3];
  const bd = new Board(ui.board, { xmin: -7, xmax: 7.5, ymin: -3.2, ymax: 6.8, width: 560 });
  bd.grid(1);
  const pq = sub(a, mul(2, b));
  bd.line(mul(-3.5, pq), mul(2, pq), { color: C.target, width: 2, dash: "6 6", opacity: 0.6, layer: bd.bg });
  bd.arrow([0, 0], a, { color: C.a, width: 2.5, label: "{a}", labelSide: -1, opacity: 0.7, layer: bd.bg });
  bd.arrow([0, 0], b, { color: C.b, width: 2.5, label: "{b}", labelSide: 1, opacity: 0.7, layer: bd.bg });
  bd.arrow([0, 0], pq, { color: C.target, width: 4, label: "{p}+{q}", labelSide: -1, layer: bd.bg });
  bd.point([0, 0], { layer: bd.bg });

  const render = (m) => {
    bd.clear();
    const qr = add(mul(-1 - m, a), mul(4, b));
    bd.arrow([0, 0], qr, { color: C.red, width: 4, label: "{q}−{r}", labelSide: 1 });
  };
  const input = slider(ui.ctrl, { min: -4, max: 4, step: 0.5, value: -2, label: "m" }, render);
  if (ui.autoplay) sweep(bd, input, (t) => 4 * Math.sin(t * 0.7));
  info(ui, "보라색 점선 위에 빨간 벡터가 놓이면 두 벡터는 평행해요. 계산으로도 확인해 보세요.");
  render(-2);
}

// p5: m을 바꾸며 점 C의 자취 보기
function collinearTool(ui) {
  const a = [1.5, 0.3], b = [0.3, 1.2];
  const bd = new Board(ui.board, { xmin: -2.5, xmax: 9.2, ymin: -6.8, ymax: 2.2, width: 560 });
  bd.grid(1);
  const dir = sub(b, a);
  bd.line(add(a, mul(-12, dir)), add(a, mul(12, dir)), { color: C.faint, width: 1.5, dash: "6 6", layer: bd.bg });
  bd.arrow([0, 0], a, { color: C.a, width: 3, label: "{a}", labelSide: -1, layer: bd.bg });
  bd.arrow([0, 0], b, { color: C.b, width: 3, label: "{b}", labelSide: 1, layer: bd.bg });
  bd.point([0, 0], { label: "O", dx: -12, dy: 12, layer: bd.bg });
  bd.point(a, { label: "A", dx: 12, dy: 10, layer: bd.bg });
  bd.point(b, { label: "B", dx: -12, dy: -10, layer: bd.bg });
  const trail = el("g", {}, bd.bg);
  const seen = new Set();

  const at = (m) => add(mul(2 * m, a), mul(m - 5, b));
  const render = (m) => {
    bd.clear();
    if (!seen.has(m)) {
      seen.add(m);
      bd.point(at(m), { color: C.sum, r: 3, layer: trail });
    }
    const P = at(m);
    bd.arrow([0, 0], P, { color: C.sum, width: 2.5, opacity: 0.7 });
    bd.point(P, { color: C.sum, r: 6.5, label: "C", dx: 14, dy: -12 });
  };
  const input = slider(ui.ctrl, { min: 0, max: 3, step: 0.5, value: 0, label: "m" }, render);
  if (ui.autoplay) sweep(bd, input, (t) => 1.5 - 1.5 * Math.cos(t * 0.6));
  info(ui, "회색 점선은 직선 AB예요. C가 이 직선 위에 오는 m을 찾고, 계산으로 확인해 보세요.");
  render(0);
}

// p6: 직육면체를 돌려 보며 네 벡터의 합 보기
function cuboidTool(ui) {
  const P3 = { A: [0, 0, 2], B: [3, 0, 2], C: [3, 2, 2], D: [0, 2, 2], E: [0, 0, 0], F: [3, 0, 0], G: [3, 2, 0], H: [0, 2, 0] };
  const center = [1.5, 1, 1];
  const edges = ["AB", "BC", "CD", "DA", "EF", "FG", "GH", "HE", "AE", "BF", "CG", "DH"];
  const vecs = [["AG", C.a], ["BH", C.b], ["CE", C.target], ["DF", C.pink]];
  const bd = new Board(ui.board, { xmin: -4, xmax: 4, ymin: -3.3, ymax: 3.3, width: 560 });
  let yaw = -0.55, pitch = 0.35, chain = false, last = null;

  const sub3 = (p, q) => p.map((x, i) => x - q[i]);
  const add3 = (p, q) => p.map((x, i) => x + q[i]);
  // 이어 붙이면 합 벡터가 아래로 길게 뻗으므로 그때만 축소하고 위로 올려 판 안에 넣는다.
  const proj = (p) => {
    const [x, y, z] = sub3(p, center);
    const zoom = chain ? 0.55 : 1, shift = chain ? 2.3 : 0;
    const x1 = x * Math.cos(yaw) - y * Math.sin(yaw);
    const y1 = x * Math.sin(yaw) + y * Math.cos(yaw);
    return [x1 * zoom, (y1 * Math.sin(pitch) + z * Math.cos(pitch)) * zoom + shift];
  };
  const render = () => {
    bd.clear();
    for (const e of edges) bd.line(proj(P3[e[0]]), proj(P3[e[1]]), { color: C.ink, width: 2, opacity: 0.75 });
    const c2 = proj(center);
    for (const [k, p] of Object.entries(P3)) {
      const q = proj(p);
      const d = sub(q, c2), n = Math.hypot(...d) || 1;
      bd.point(q, { label: k, r: 3.5, dx: (d[0] / n) * 16, dy: (-d[1] / n) * 16, size: 16 });
    }
    bd.arrow(proj(P3.G), proj(P3.C), { color: C.red, width: 4, label: "[GC]", labelSide: 1 });
    if (!chain) {
      for (const [name, color] of vecs) bd.arrow(proj(P3[name[0]]), proj(P3[name[1]]), { color, width: 3 });
    } else {
      let pos = P3.A;
      for (const [name, color] of vecs) {
        const next = add3(pos, sub3(P3[name[1]], P3[name[0]]));
        bd.arrow(proj(pos), proj(next), { color, width: 3, label: `[${name}]` });
        pos = next;
      }
      bd.arrow(proj(P3.A), proj(pos), { color: C.sum, width: 5, opacity: 0.8, label: "합", labelSide: -1 });
    }
  };
  bd.svg.classList.add("rotatable");
  bd.drag(bd.svg, {
    onStart: (w) => { last = w; },
    onMove: (w) => {
      if (!last) return;
      yaw += (w[0] - last[0]) * 0.35;
      pitch = Math.max(-1.2, Math.min(1.2, pitch - (w[1] - last[1]) * 0.35));
      last = w;
      render();
    },
  });
  const legend = document.createElement("div");
  legend.className = "legend";
  legend.innerHTML = vecs.map(([n, c]) => `<span style="color:${c}">■ ${fmt(`[${n}]`)}</span>`).join(" ");
  ui.ctrl.appendChild(legend);
  const toggle = button(ui.ctrl, "이어 붙이기", () => {
    chain = !chain;
    toggle.textContent = chain ? "따로 보기" : "이어 붙이기";
    render();
  });
  button(ui.ctrl, "처음 각도", () => { yaw = -0.55; pitch = 0.35; render(); });
  info(ui, "그림을 끌어서 돌려 보세요. 빨간 벡터가 [GC]예요.");
  if (ui.autoplay) autoplay(bd, (t, dt) => { yaw += dt * 0.5; render(); }); // 천천히 돌며 입체를 보여 준다
  render();
}

// p7: 원 위의 P와 단위원 위의 Q
function circleTool(ui) {
  const bd = new Board(ui.board, { xmin: -1.6, xmax: 4.6, ymin: -1.6, ymax: 4.6, width: 520 });
  bd.grid(1);
  bd.arrow([-1.5, 0], [4.5, 0], { color: C.ink, width: 1.5, layer: bd.bg });
  bd.arrow([0, -1.5], [0, 4.5], { color: C.ink, width: 1.5, layer: bd.bg });
  bd.text([4.35, -0.3], "x", { italic: true, layer: bd.bg });
  bd.text([-0.3, 4.35], "y", { italic: true, layer: bd.bg });
  bd.text([-0.25, -0.3], "O", { layer: bd.bg });
  bd.circle([2, 2], 2, { width: 2.5, layer: bd.bg });
  bd.circle([0, 0], 1, { color: C.faint, width: 1.5, dash: "5 5", layer: bd.bg });
  const trail = el("g", {}, bd.bg);

  let phi = Math.PI * 1.2, anim = null, lastDot = null;
  const h = bd.handle([2, 2], { color: C.a });
  const render = () => {
    bd.clear();
    const P = [2 + 2 * Math.cos(phi), 2 + 2 * Math.sin(phi)];
    const Q = mul(1 / Math.hypot(...P), P);
    bd.line([0, 0], P, { color: C.faint, width: 1.5 });
    if (!lastDot || dist(lastDot, Q) > 0.03) { // 자취 점은 조금씩 떨어뜨려 찍고, 너무 많아지면 오래된 것부터 지운다
      bd.point(Q, { color: C.sum, r: 2.6, layer: trail });
      if (trail.childElementCount > 400) trail.firstElementChild.remove();
      lastDot = Q;
    }
    bd.arrow([0, 0], Q, { color: C.sum, width: 3.5 });
    bd.point(Q, { color: C.sum, r: 6, label: "Q", dx: -14, dy: -12 });
    bd.point(P, { color: C.a, r: 6, label: "P", dx: 14, dy: -12 });
    h.move(P);
  };
  bd.drag(h.el, {
    onStart: () => { if (anim) cancelAnimationFrame(anim); anim = null; },
    onMove: (w) => { phi = Math.atan2(w[1] - 2, w[0] - 2); render(); },
  });
  button(ui.ctrl, "한 바퀴 돌리기", () => {
    if (anim) cancelAnimationFrame(anim);
    const start = phi, t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / 3000);
      phi = start + t * 2 * Math.PI;
      render();
      anim = t < 1 ? requestAnimationFrame(tick) : null;
    };
    anim = requestAnimationFrame(tick);
  });
  button(ui.ctrl, "자취 지우기", () => { trail.replaceChildren(); lastDot = null; render(); });
  info(ui, "$|\\VV{OQ}|=1$이므로 Q는 항상 점선 단위원 위에 있어요. Q가 지나가는 부분은 어디일까요?");
  if (ui.autoplay) autoplay(bd, (t, dt) => { phi += dt * 1.3; render(); });
  render();
}

// 모션 그래픽: 판을 만지기 전까지 그림이 저절로 움직인다. 창을 닫으면 멈춘다. 멈추는 함수를 돌려준다.
function autoplay(bd, step, onStop) {
  let stopped = false, t = 0, last = performance.now();
  const stop = () => {
    if (stopped) return;
    stopped = true;
    onStop?.();
  };
  bd.svg.addEventListener("pointerdown", stop, { capture: true, once: true });
  const tick = (now) => {
    if (stopped || !bd.svg.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    step(t, dt);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return stop;
}

// 점들을 차례로 옮겨 다닌다: 한 구간을 move초 동안 가고 hold초 머문다. 머무는 동안은 그 점 자체를 돌려준다.
function tour(points, t, move, hold) {
  const seg = move + hold, n = points.length - 1;
  const i = Math.floor(t / seg) % n, u = (t % seg) / move;
  if (u >= 1) return points[i + 1].slice();
  const e = u * u * (3 - 2 * u); // 부드럽게 출발·정지
  return [points[i][0] + (points[i + 1][0] - points[i][0]) * e, points[i][1] + (points[i + 1][1] - points[i][1]) * e];
}

// 슬라이더 값을 저절로 바꾼다. 슬라이더나 판을 만지면 멈춘다.
function sweep(bd, input, value) {
  const step = Number(input.step);
  const stop = autoplay(bd, (t) => {
    const v = String(Math.round(value(t) / step) * step);
    if (v !== input.value) { input.value = v; input.dispatchEvent(new Event("input")); }
  });
  for (const ev of ["pointerdown", "keydown"]) input.addEventListener(ev, stop, { once: true });
}
