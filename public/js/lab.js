// 벡터 실험실: 손으로 끌어서 벡터의 덧셈·실수배를 직접 확인하는 5단계.
// 각 단계는 build(ui, done)으로 만든다. ui = { board, status, ctrl } (모두 div), done()은 성공 시 한 번 호출.
import { Board, C, el, add, sub, mul, dot, dist, cardDrop } from "./svg.js";
import { fmt } from "./mathtext.js";

export const LAB_LEVELS = [
  {
    id: "l1",
    title: "삼각형법",
    goal: "주황색 {b}의 시점(점선 동그라미)을 끌어서 파란색 {a}의 종점(화살촉)에 붙여 보세요.",
    build: (ui, done) => sumLevel(ui, done, "tri"),
  },
  {
    id: "l2",
    title: "평행사변형법",
    goal: "이번에는 {b}의 시점을 {a}의 시점(출발점)에 붙여 보세요. 무엇이 보이나요?",
    build: (ui, done) => sumLevel(ui, done, "para"),
  },
  {
    id: "l3",
    title: "실수배",
    goal: "{a}의 화살촉을 끌어 늘이거나 뒤집어서, 보라색 유물 벡터와 똑같이 만들어 보세요.",
    build: scaleLevel,
  },
  {
    id: "l4",
    title: "유물 길 찾기",
    goal: "벡터 카드를 판 위로 끌어다 놓거나 눌러서, 출발점에서 유물 🏺까지 가는 길을 만드세요.",
    build: (ui, done) => chainLevel(ui, done, [2, -1], false),
  },
  {
    id: "l5",
    title: "유물 길 찾기 2",
    goal: "이번 유물은 출발점 바로 위에 있어요! {a}, {b} 카드만으로 갈 수 있을까요?",
    build: (ui, done) => chainLevel(ui, done, [-1, 2], true),
  },
];

// 끄는 동안 같은 문장을 매번 다시 조판하지 않도록, 바뀔 때만 고친다.
function say(ui, text, kind = "") {
  ui.status.className = `status ${kind}`;
  if (ui.status.dataset.src === text) return;
  ui.status.dataset.src = text;
  ui.status.innerHTML = fmt(text);
}

function kText(k) {
  if (k === 1) return "";
  if (k === -1) return "−";
  return String(k).replace("-", "−");
}

// 1, 2단계: 두 벡터의 합 (삼각형법 / 평행사변형법)
function sumLevel(ui, done, mode) {
  const bd = new Board(ui.board, { xmin: -1, xmax: 9, ymin: -4, ymax: 5 });
  bd.grid(1);
  const A = [3, 1], Bv = [1, 2.5];
  const target = mode === "tri" ? A : [0, 0];
  const wrongSpot = mode === "tri" ? [0, 0] : A;
  let tail = [5.5, -3.2], grab = [0, 0], snapped = false, finished = false;

  const hit = el("line", { stroke: "transparent", "stroke-width": 30, "stroke-linecap": "round", class: "handle" }, bd.top);
  const h = bd.handle(tail, { color: C.b });

  const render = () => {
    bd.clear();
    bd.point([0, 0], { r: 3.5 });
    if (snapped && mode === "para") {
      bd.arrow(Bv, add(Bv, A), { color: C.a, width: 2, dash: "6 6", opacity: 0.6 });
      bd.arrow(A, add(A, Bv), { color: C.b, width: 2, dash: "6 6", opacity: 0.6 });
    }
    if (snapped) bd.arrow([0, 0], add(A, Bv), { color: C.sum, width: 4.5, label: "{a}+{b}", labelSide: 1 });
    bd.arrow([0, 0], A, { color: C.a, width: 3.5, label: "{a}", labelSide: -1 });
    const head = add(tail, Bv);
    bd.arrow(tail, head, { color: C.b, width: 3.5, label: "{b}", labelSide: mode === "tri" ? -1 : 1 });
    for (const [k, v] of [["x1", bd.X(tail[0])], ["y1", bd.Y(tail[1])], ["x2", bd.X(head[0])], ["y2", bd.Y(head[1])]]) hit.setAttribute(k, v);
    h.move(tail);
  };

  const grabStart = (w) => { grab = sub(w, tail); };
  const grabMove = (w) => {
    if (finished) return;
    let t = sub(w, grab);
    snapped = dist(t, target) < 0.6;
    if (snapped) t = target.slice();
    else if (dist(t, wrongSpot) < 0.6) {
      say(ui, mode === "tri"
        ? "거기는 {a}의 시점이에요. 화살촉(종점) 쪽에 붙여 보세요!"
        : "거기는 {a}의 종점이에요. 이번에는 출발점(시점)에 붙여 보세요!", "warn");
    }
    tail = t;
    render();
  };
  const grabEnd = () => {
    if (!snapped || finished) return;
    finished = true;
    render();
    say(ui, mode === "tri"
      ? "삼각형법 성공! {a}의 종점에 {b}의 시점을 이으면, 처음 출발점에서 마지막 도착점으로 가는 초록 벡터가 {a}+{b}예요."
      : "평행사변형법 성공! 두 벡터의 시점을 맞추고 평행사변형을 그리면 대각선이 {a}+{b}예요. 1단계에서 만든 초록 벡터와 똑같죠?", "ok");
    done();
  };
  for (const t of [hit, h.el]) bd.drag(t, { onStart: grabStart, onMove: grabMove, onEnd: grabEnd });
  render();
}

// 3단계: 실수배
function scaleLevel(ui, done) {
  const bd = new Board(ui.board, { xmin: -7, xmax: 7, ymin: -4, ymax: 4 });
  bd.grid(1);
  const a = [2, 1], T = mul(-1.5, a);
  let k = 1, finished = false;
  bd.line(mul(-4, a), mul(4, a), { color: C.faint, width: 1.5, dash: "4 6", layer: bd.bg });
  const h = bd.handle(a, { color: C.a });

  const render = () => {
    bd.clear();
    bd.arrow([0, 0], T, { color: C.target, width: 9, opacity: 0.3 });
    bd.text(T, "🏺", { size: 28, dx: -18, dy: 14 });
    bd.arrow([0, 0], a, { color: C.a, width: 2, dash: "5 5", label: "{a}", labelSide: 1, opacity: 0.7 });
    const v = mul(k, a);
    if (k === 0) bd.point([0, 0], { color: C.a, r: 7, label: "영벡터", dy: -18 });
    else bd.arrow([0, 0], v, { color: C.a, width: 4.5, label: `${kText(k)}{a}`, labelSide: -1 });
    h.move(v);
  };
  const describe = () => {
    if (k === 0) return say(ui, "k = 0 이면 0{a}는 영벡터예요. 크기가 0이고 방향은 생각하지 않아요.");
    const m = Math.abs(k);
    say(ui, k > 0
      ? `k = ${k} : {a}와 같은 방향, 크기는 ${m}배`
      : `k = ${kText(k)} : {a}와 반대 방향, 크기는 ${m}배`);
  };
  bd.drag(h.el, {
    onMove: (w) => {
      if (finished) return;
      const raw = dot(w, a) / dot(a, a);
      k = Math.max(-3, Math.min(3, Math.round(raw * 2) / 2));
      render();
      describe();
    },
    onEnd: () => {
      if (finished || k !== -1.5) return;
      finished = true;
      say(ui, "성공! 유물 벡터는 −1.5{a}예요. k가 음수이면 방향이 반대가 되고, 크기는 |k|배가 돼요.", "ok");
      done();
    },
  });
  render();
  describe();
}

// 4, 5단계: 기울어진 격자에서 {a}, {b} 카드로 길 만들기
function chainLevel(ui, done, [ta, tb], commutative) {
  const A = [2, 0], B = [1, 1.5];
  const T = add(mul(ta, A), mul(tb, B));
  const bd = new Board(ui.board, { xmin: -5, xmax: 8, ymin: -4, ymax: 5 });
  for (let j = -6; j <= 6; j++) bd.line(add(mul(j, B), mul(-9, A)), add(mul(j, B), mul(9, A)), { color: C.grid, width: 1.2, layer: bd.bg });
  for (let i = -9; i <= 9; i++) bd.line(add(mul(i, A), mul(-6, B)), add(mul(i, A), mul(6, B)), { color: C.grid, width: 1.2, layer: bd.bg });
  bd.point([0, 0], { label: "출발", dx: -30, dy: 2, size: 17, layer: bd.bg });
  bd.circle(T, 0.32, { color: C.target, fill: C.target, opacity: 0.25, layer: bd.bg });
  bd.text(T, "🏺", { size: 28, layer: bd.bg });

  const chain = [];
  let finished = false;
  const MAX = 12;

  const combo = (na, nb) => {
    const term = (n, v, first) => {
      if (n === 0) return "";
      const sign = n < 0 ? (first ? "−" : " − ") : first ? "" : " + ";
      const m = Math.abs(n);
      return `${sign}${m === 1 ? "" : m}{${v}}`;
    };
    const s = term(na, "a", true);
    return (s + term(nb, "b", s === "")) || "영벡터 (출발점)";
  };
  // 같은 식을 MathJax 수식으로: 2{a} − {b} → $2\vv{a}-\vv{b}$
  const comboTex = (na, nb) => {
    if (!na && !nb) return "영벡터 (출발점)";
    return `$${combo(na, nb).replace(/\{([a-z])\}/g, "\\vv{$1}").replace(/ ?− ?/g, "-").replace(/ \+ /g, "+")}$`;
  };

  const render = () => {
    bd.clear();
    let pos = [0, 0], na = 0, nb = 0;
    for (const c of chain) {
      const v = mul(c.s, c.k === "a" ? A : B);
      bd.arrow(pos, add(pos, v), { color: c.k === "a" ? C.a : C.b, width: 3.5 });
      pos = add(pos, v);
      if (c.k === "a") na += c.s; else nb += c.s;
    }
    bd.point(pos, { color: C.ink, r: 6 });
    if (finished) bd.arrow([0, 0], T, { color: C.sum, width: 4.5, label: combo(na, nb), labelSide: commutative ? 1 : -1 });
    return { pos, na, nb };
  };

  const step = (k, s) => {
    if (finished) return;
    if (chain.length >= MAX) return say(ui, "카드는 12장까지 쓸 수 있어요. 되돌리기를 눌러 보세요.", "warn");
    chain.push({ k, s });
    update();
  };

  const update = () => {
    const { pos, na, nb } = render();
    if (dist(pos, T) < 1e-9 && chain.length > 0) {
      finished = true;
      render();
      say(ui, commutative
        ? `도착! 유물까지 가는 벡터는 ${comboTex(na, nb)}예요. 카드 순서를 바꿔도 도착점은 같아요 (덧셈의 교환법칙).`
        : `도착! 유물까지 가는 벡터는 ${comboTex(na, nb)}예요. 같은 카드를 두 번 쓰면 2배가 되죠?`, "ok");
      done();
    } else {
      say(ui, `지금 위치: ${comboTex(na, nb)}`);
    }
  };

  const tray = document.createElement("div");
  tray.className = "tray";
  for (const [k, s] of [["a", 1], ["a", -1], ["b", 1], ["b", -1]]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `card card-${k}`;
    btn.innerHTML = fmt(`${s > 0 ? "+" : "−"}{${k}}`);
    btn.setAttribute("aria-label", `${s > 0 ? "더하기" : "빼기"} 벡터 ${k}`);
    cardDrop(btn, bd, () => step(k, s));
    tray.appendChild(btn);
  }
  const undo = document.createElement("button");
  undo.type = "button";
  undo.className = "btn ghost-btn";
  undo.textContent = "↶ 되돌리기";
  undo.onclick = () => { if (!finished && chain.length) { chain.pop(); update(); } };
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "btn ghost-btn";
  reset.textContent = "처음부터";
  reset.onclick = () => { finished = false; chain.length = 0; update(); };
  tray.append(undo, reset);
  ui.ctrl.appendChild(tray);
  update();
}
