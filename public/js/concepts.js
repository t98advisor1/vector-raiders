// 개념 학습 카드: 문제 상자나 벡터 점프를 열기 전에 핵심 개념을 먼저 보여 준다.
// 학습을 돕는 게 목적이라 정답 수치는 두지 않는다.
// 그림은 학생이 직접 조작하는 인터랙티브 위젯: 손잡이를 끌거나 슬라이더를 움직이면
// 벡터의 합·실수배·분해가 실시간으로 바뀌어 보인다.
// key: 문제 id("p1"~"p7") 또는 벡터 실험실 단계 id("l1"~"l3" — 실험실은 l1·l2·l3만 카드가 있다).
import { Board, C, add, sub, mul, dist } from "./svg.js";

export const CONCEPTS = {
  l1: {
    title: "삼각형법",
    tagline: "두 벡터를 '꼬리에 머리' 이어 붙이면, 시작점에서 끝점을 잇는 화살표가 합이에요.",
    points: [
      "파란 손잡이({a}의 머리)와 주황 손잡이({b}의 머리)를 끌어 보세요.",
      "{a}의 끝에 {b}가 이어져 붙고, 시작점에서 끝점까지 초록 화살표가 합이에요.",
      "순서를 바꿔 이어 붙여도 같은 곳에 도착해요. ({a}+{b} = {b}+{a})",
    ],
    fig: "triangle",
  },
  l2: {
    title: "평행사변형법",
    tagline: "두 벡터를 '꼬리에 꼬리' 모아 놓으면, 대각선이 합이에요.",
    points: [
      "두 손잡이를 끌어 {a}와 {b}를 원하는 방향으로 세워 보세요.",
      "두 벡터를 변으로 하는 평행사변형이 저절로 그려져요.",
      "공통 시작점에서 반대쪽 꼭짓점으로 그은 대각선이 {a}+{b}예요.",
    ],
    fig: "parallelogram",
  },
  l3: {
    title: "실수배",
    tagline: "벡터에 실수를 곱하면 길이가 늘고 줄고, 음수면 방향이 반대가 돼요.",
    points: [
      "슬라이더로 k를 바꿔 보세요. $k\\\\vv{a}$가 실시간으로 변해요.",
      "$2\\\\vv{a}$는 같은 방향 두 배, $\\\\dfrac{1}{2}\\\\vv{a}$는 절반 길이예요.",
      "$k$가 음수면 방향이 반대가 돼요. ($-\\\\vv{a}$ = 뒤로 한 칸)",
    ],
    fig: "scale",
  },
  p1: {
    title: "같은 벡터 알아보기",
    tagline: "벡터는 '크기와 방향'이 같으면 위치와 상관없이 같은 벡터예요.",
    points: [
      "손잡이를 끌어 빨간 [BC]를 평행이동해 보세요.",
      "시작점과 끝점이 딱 꼭짓점(또는 O)에 놓이면 같은 벡터예요.",
      "모양이 같아 보여도 방향이 다르면(→ vs ←) 다른 벡터예요.",
    ],
    fig: "translate",
  },
  p2: {
    title: "벡터의 뺄셈",
    tagline: "$\\\\VV{MN}-\\\\VV{MB}$는 $\\\\VV{MN}+\\\\VV{BM}$로 바꿔 이어 붙일 수 있어요.",
    points: [
      "$-\\\\VV{MB}$는 [MB]를 뒤집은 [BM]이에요. 빼기는 '방향 뒤집아 더하기'로!",
      "손잡이로 $-\\\\VV{MB}$를 끌어 점 B에 딱 붙여 보세요.",
      "$\\\\VV{BM}+\\\\VV{MN}$: 꼬리에 머리로 이어 붙이면 [BN] 한 개로 정리돼요.",
    ],
    fig: "subtract",
  },
  p3: {
    title: "벡터의 실수배 합으로 나타내기",
    tagline: "$\\\\VV{OC}=m\\\\vv{a}+n\\\\vv{b}$는 {a} 방향과 {b} 방향으로 각각 얼마씩 가는지로 쪼개는 일이에요.",
    points: [
      "슬라이더로 점 C를 호 위에서 움직여 보세요.",
      "주황 조각은 {a} 방향($6m$), 파란 조각은 {b} 방향($6n$)이에요.",
      "직각삼각형에서 $30^{\\\\circ}$, $60^{\\\\circ}$를 쓰면 $m$, $n$이 나와요.",
    ],
    fig: "decompose",
  },
  p4: {
    title: "두 벡터가 평행한 조건",
    tagline: "$\\\\vv{x} \\\\parallel \\\\vv{y}$ ⟺ $\\\\vv{x}=k\\\\vv{y}$인 실수 $k$가 있어요.",
    points: [
      "슬라이더로 $m$을 바꾸면 빨간 벡터 $\\\\vv{q}-\\\\vv{r}$가 움직여요.",
      "보라색 점선($\\\\vv{p}+\\\\vv{q}$ 방향) 위에 올라오면 두 벡터는 평행해요.",
      "평행하면 한 벡터를 다른 벡터의 실수배 $k$배로 쓸 수 있어요.",
    ],
    fig: "parallel",
  },
  p5: {
    title: "세 점이 한 직선 위에 있는 조건",
    tagline: "$\\\\VV{OC}=s\\\\vv{a}+t\\\\vv{b}$일 때, 세 점 A·B·C가 일직선이면 $s+t=1$이에요.",
    points: [
      "슬라이더로 $m$을 바꾸면 점 C가 움직여요. 지나간 자리가 점으로 남아요.",
      "C가 회색 점선(직선 AB) 위에 오는 $m$을 찾아 보세요.",
      "그 순간 $\\\\VV{OC}=(1-k)\\\\vv{a}+k\\\\vv{b}$ — 계수의 합이 $1$이에요.",
    ],
    fig: "collinear",
  },
  p6: {
    title: "벡터를 이어 붙여 합 구하기",
    tagline: "여러 벡터의 합은 차례로 이어 붙이면 '시작점 → 끝점' 한 개로 남아요.",
    points: [
      "'이어 붙이기'를 눌러 네 벡터를 차례로 연결해 보세요.",
      "같은 방향으로 가는 성분끼리는 서로 지워져요. (오른쪽 a, 왼쪽 a → 0)",
      "남는 건 높이 방향뿐! 초록 합 벡터를 [GC]와 비교해 방향(위? 아래?)을 보세요.",
    ],
    fig: "chain",
  },
  p7: {
    title: "단위 벡터와 점의 자취",
    tagline: "$\\\\dfrac{\\\\VV{OP}}{|\\\\VV{OP}|}$는 '같은 방향, 길이 1'인 단위 벡터예요.",
    points: [
      "점 P를 원 위에서 한 바퀴 끌어 보세요.",
      "초록 점 Q는 언제나 원점에서 거리 1인 점이에요.",
      "그래서 Q의 자취는 점선 단위원(호) 위에 있어요.",
    ],
    fig: "unit",
  },
};

// ---------- 인터랙티브 위젯: 개념마다 하나, 손잡이·슬라이더로 직접 조작한다 ----------
const WIDGETS = {
  // 삼각형법: {a} 머리와 {b} 머리를 끌면 꼬리에 머리로 이어 붙인 합이 실시간으로 그려진다
  triangle(box) {
    const bd = new Board(box, { xmin: 0, xmax: 7, ymin: 0, ymax: 5, width: 300 });
    const A = [1, 1];
    let headA = [3.6, 1.2], headB = [4.6, 3.2];
    const hA = bd.handle(headA, { color: C.a, r: 13 });
    const hB = bd.handle(headB, { color: C.b, r: 13 });
    bd.point(A, { label: "P", dx: -12, dy: 12, layer: bd.bg });
    const render = () => {
      bd.clear();
      bd.arrow(A, headA, { color: C.a, width: 3.5, label: "{a}", labelSide: -1 });
      bd.arrow(headA, headB, { color: C.b, width: 3.5, label: "{b}", labelSide: 1 });
      bd.arrow(A, headB, { color: C.sum, width: 4.5, dash: "7 4", label: "{a}+{b}", labelSide: -1 });
      bd.point(headA);
      hA.move(headA);
      hB.move(headB);
    };
    bd.drag(hA.el, { onMove: (w) => { headA = clamp(w, A, 5.6); render(); } });
    bd.drag(hB.el, { onMove: (w) => { headB = clamp(w, A, 5.6); render(); } });
    render();
  },

  // 평행사변형법: 꼬리에 꼬리로 모은 두 벡터의 대각선
  parallelogram(box) {
    const bd = new Board(box, { xmin: 0, xmax: 7, ymin: 0, ymax: 5, width: 300 });
    const A = [1, 1];
    let P = [4.2, 1.2], Q = [2.2, 3.6];
    const hP = bd.handle(P, { color: C.a, r: 13 });
    const hQ = bd.handle(Q, { color: C.b, r: 13 });
    bd.point(A, { label: "O", dx: -12, dy: 12, layer: bd.bg });
    const render = () => {
      bd.clear();
      const S = add(P, sub(Q, A));
      bd.polygon([A, P, S, Q], { color: C.faint, width: 1.5, fill: "rgba(148,163,184,0.12)" });
      bd.arrow(A, P, { color: C.a, width: 3.5, label: "{a}", labelSide: -1 });
      bd.arrow(A, Q, { color: C.b, width: 3.5, label: "{b}", labelSide: -1 });
      bd.arrow(A, S, { color: C.sum, width: 4.5, label: "{a}+{b}", labelSide: 1 });
      hP.move(P);
      hQ.move(Q);
    };
    bd.drag(hP.el, { onMove: (w) => { P = clamp(w, A, 5.6); render(); } });
    bd.drag(hQ.el, { onMove: (w) => { Q = clamp(w, A, 5.6); render(); } });
    render();
  },

  // 실수배: 슬라이더 k로 {a}의 k배를 늘였다 줄였다 뒤집어 본다
  scale(box) {
    const bd = new Board(box, { xmin: -3, xmax: 3, ymin: -1.6, ymax: 1.6, width: 300 });
    const O = [0, 0], a = [1.8, 0.55];
    bd.arrow(O, a, { color: C.a, width: 3.5, opacity: 0.5, label: "{a}", labelSide: 1, layer: bd.bg });
    bd.point(O, { label: "O", dx: -10, dy: 12, layer: bd.bg });
    const input = slider(box, { min: -2, max: 2, step: 0.1, value: 2, label: "k" }, (k) => render(k));
    const render = (k) => {
      bd.clear();
      bd.arrow(O, mul(k, a), { color: C.sum, width: 4.5, label: `${String(k).replace("-", "−")}{a}`, labelSide: k >= 0 ? -1 : -1 });
    };
    render(2);
    return () => input;
  },

  // 같은 벡터: [BC]를 평행이동해 꼭짓점에 딱 맞춰 본다
  translate(box) {
    const r3 = Math.sqrt(3) / 2;
    const V = { A: [-0.5, r3], B: [-1, 0], C: [-0.5, -r3], D: [0.5, -r3], E: [1, 0], F: [0.5, r3], O: [0, 0] };
    const keys = Object.keys(V);
    const bd = new Board(box, { xmin: -2.2, xmax: 2.8, ymin: -1.9, ymax: 1.8, width: 300 });
    bd.polygon(["A", "B", "C", "D", "E", "F"].map((k) => V[k]), { width: 2, layer: bd.bg });
    for (const k of keys) bd.point(V[k], { label: k, r: 3, dx: k === "O" ? 12 : V[k][0] * 20, dy: k === "O" ? 14 : -V[k][1] * 20, size: 15, layer: bd.bg });
    const BC = sub(V.C, V.B);
    bd.arrow(V.B, V.C, { color: C.red, width: 3, layer: bd.bg });
    let tail = [1.8, 1.0];
    const h = bd.handle(tail, { color: C.red, r: 12 });
    const render = () => {
      bd.clear();
      bd.arrow(tail, add(tail, BC), { color: C.red, width: 3, dash: "6 4" });
      const from = keys.find((k) => dist(V[k], tail) < 1e-9);
      const to = keys.find((k) => dist(V[k], add(tail, BC)) < 1e-6);
      if (from && to) bd.text([0, 1.55], `[${from}${to}] = [BC]`, { color: C.red, size: 20 });
      h.move(tail);
    };
    bd.drag(h.el, {
      onMove: (w) => {
        const k = keys.find((key) => dist(V[key], w) < 0.35);
        tail = k ? V[k].slice() : w;
        render();
      },
    });
    render();
  },

  // 벡터의 뺄셈: −[MB]를 점 B에 붙이면 [BM]+[MN] = [BN]
  subtract(box) {
    const A = [0, 3.4], B = [0, 0], Cc = [3, 0], M = [0, 1.7], N = [1.5, 3.4];
    const bd = new Board(box, { xmin: -1, xmax: 5.6, ymin: -0.8, ymax: 4.2, width: 300 });
    bd.polygon([A, B, Cc, A], { color: C.faint, width: 1.5, layer: bd.bg });
    for (const [k, p, dx, dy] of [["A", A, -13, 0], ["B", B, -13, 13], ["C", Cc, 13, 13], ["M", M, -13, 0], ["N", N, 0, -14]])
      bd.point(p, { label: k, r: 3, dx, dy, size: 15, layer: bd.bg });
    const BM = sub(M, B);
    let tail = [4.2, 0.8], snapped = false;
    const h = bd.handle(tail, { color: C.b, r: 12 });
    const render = () => {
      bd.clear();
      if (snapped) bd.arrow(B, N, { color: C.sum, width: 4.5, label: "[BN]", labelSide: -1 });
      bd.arrow(tail, add(tail, BM), { color: C.b, width: 3, dash: "6 4", label: "−[MB]", labelSide: snapped ? 1 : -1 });
      h.move(tail);
    };
    bd.drag(h.el, {
      onMove: (w) => {
        snapped = dist(w, B) < 0.4;
        tail = snapped ? B.slice() : w;
        render();
      },
    });
    render();
  },

  // 실수배 합 분해: 점 C를 호 위에서 움직이면 m{a}+n{b}로 쪼개진다
  decompose(box) {
    const R = 3;
    const bd = new Board(box, { xmin: -0.9, xmax: 3.9, ymin: -0.9, ymax: 3.9, width: 300 });
    const O = [0, 0];
    bd.arrow(O, [R, 0], { color: C.b, width: 2.5, opacity: 0.6, label: "{a}", labelSide: 1, layer: bd.bg });
    bd.arrow(O, [0, R], { color: C.a, width: 2.5, opacity: 0.6, label: "{b}", labelSide: -1, layer: bd.bg });
    bd.point(O, { label: "O", dx: -11, dy: 11, size: 15, layer: bd.bg });
    const input = slider(box, { min: 0, max: 90, step: 5, value: 50, label: "∠" }, (deg) => render(deg));
    const render = (deg) => {
      bd.clear();
      const t = (deg * Math.PI) / 180;
      const P = [R * Math.cos(t), R * Math.sin(t)];
      bd.line(P, [P[0], 0], { color: C.faint, width: 1.2, dash: "4 4" });
      bd.line(P, [0, P[1]], { color: C.faint, width: 1.2, dash: "4 4" });
      bd.arrow(O, [P[0], 0], { color: C.b, width: 5, opacity: 0.6, label: "m{a}", labelSide: 1 });
      bd.arrow(O, [0, P[1]], { color: C.a, width: 5, opacity: 0.6, label: "n{b}", labelSide: -1 });
      bd.arrow(O, P, { color: C.sum, width: 3 });
      bd.point(P, { label: "C", dx: 12, dy: -10, size: 15 });
    };
    render(50);
    return () => input;
  },

  // 평행 조건: m을 바꾸며 {q}−{r}가 {p}+{q} 방향 점선 위에 오는지 본다
  parallel(box) {
    const a = [1.2, 0.25], b = [0.4, 0.95];
    const bd = new Board(box, { xmin: -5, xmax: 5.5, ymin: -2.4, ymax: 4.6, width: 300 });
    const pq = sub(a, mul(2, b));
    bd.line(mul(-3, pq), mul(2.4, pq), { color: C.target, width: 2, dash: "6 5", opacity: 0.6, layer: bd.bg });
    bd.arrow([0, 0], pq, { color: C.target, width: 3, label: "{p}+{q}", labelSide: -1, layer: bd.bg });
    bd.point([0, 0], { layer: bd.bg });
    const input = slider(box, { min: -4, max: 4, step: 0.5, value: -2, label: "m" }, (m) => render(m));
    const render = (m) => {
      bd.clear();
      const qr = add(mul(-1 - m, a), mul(4, b));
      const par = Math.abs(Math.abs(m - 1) < 1e-9 ? 1 : 0); // m=1일 때 평행
      bd.arrow([0, 0], qr, { color: par ? C.sum : C.red, width: 3.5, label: "{q}−{r}", labelSide: 1 });
      if (par) bd.text([0, 3.6], "평행!", { color: C.sum, size: 20 });
    };
    render(-2);
    return () => input;
  },

  // 세 점 일직선: m을 바꾸며 C의 자취를 찍고 직선 AB 위에 오는 순간을 찾는다
  collinear(box) {
    const a = [1.2, 0.25], b = [0.25, 0.95];
    const bd = new Board(box, { xmin: -2, xmax: 7, ymin: -5.4, ymax: 1.8, width: 300 });
    const dir = sub(b, a);
    bd.line(add(a, mul(-10, dir)), add(a, mul(10, dir)), { color: C.faint, width: 1.3, dash: "5 5", layer: bd.bg });
    bd.arrow([0, 0], a, { color: C.a, width: 2.5, label: "{a}", labelSide: -1, layer: bd.bg });
    bd.arrow([0, 0], b, { color: C.b, width: 2.5, label: "{b}", labelSide: -1, layer: bd.bg });
    bd.point([0, 0], { label: "O", dx: -11, dy: 11, size: 15, layer: bd.bg });
    const at = (m) => add(mul(2 * m, a), mul(m - 5, b));
    const trail = [];
    const input = slider(box, { min: 0, max: 3, step: 0.5, value: 0, label: "m" }, (m) => render(m));
    const render = (m) => {
      bd.clear();
      const P = at(m);
      if (!trail.some((q) => dist(q, P) < 1e-6)) trail.push(P);
      for (const q of trail) bd.point(q, { color: C.sum, r: 2.5 });
      bd.arrow([0, 0], P, { color: C.sum, width: 2.5, opacity: 0.8 });
      bd.point(P, { color: C.sum, r: 5, label: "C", dx: 12, dy: -10, size: 15 });
      // s+t = 2m + (m-5): m=2일 때 계수의 합이 1 → 직선 위
      if (Math.abs(2 * m + (m - 5) - 1) < 1e-9) bd.text([1, 1.5], "s + t = 1 → 직선 위!", { color: C.sum, size: 18 });
    };
    render(0);
    return () => input;
  },

  // 이어 붙이기: 네 벡터를 따로/이어서 보며 합이 [GC] 방향임을 확인한다
  chain(box) {
    const P3 = { A: [0, 0, 2], B: [3, 0, 2], C: [3, 2, 2], D: [0, 2, 2], E: [0, 0, 0], F: [3, 0, 0], G: [3, 2, 0], H: [0, 2, 0] };
    const center = [1.5, 1, 1];
    const edges = ["AB", "BC", "CD", "DA", "EF", "FG", "GH", "HE", "AE", "BF", "CG", "DH"];
    const vecs = [["AG", C.a], ["BH", C.b], ["CE", C.target], ["DF", C.pink]];
    const bd = new Board(box, { xmin: -3.4, xmax: 3.4, ymin: -2.8, ymax: 2.8, width: 300 });
    const sub3 = (p, q) => p.map((x, i) => x - q[i]);
    const add3 = (p, q) => p.map((x, i) => x + q[i]);
    const proj = (p) => {
      const [x, y, z] = sub3(p, center);
      const zoom = chain ? 0.55 : 1, shift = chain ? 1.9 : 0;
      const x1 = x * Math.cos(-0.55) - y * Math.sin(-0.55);
      const y1 = x * Math.sin(-0.55) + y * Math.cos(-0.55);
      return [x1 * zoom, (y1 * Math.sin(0.35) + z * Math.cos(0.35)) * zoom + shift];
    };
    let chain = false;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn ghost-btn";
    btn.textContent = "이어 붙이기";
    btn.onclick = () => { chain = !chain; btn.textContent = chain ? "따로 보기" : "이어 붙이기"; render(); };
    box.appendChild(btn);
    const render = () => {
      bd.clear();
      for (const e of edges) bd.line(proj(P3[e[0]]), proj(P3[e[1]]), { color: C.ink, width: 1.6, opacity: 0.7 });
      bd.arrow(proj(P3.G), proj(P3.C), { color: C.red, width: 3, label: "[GC]", labelSide: 1 });
      if (!chain) {
        for (const [name, color] of vecs) bd.arrow(proj(P3[name[0]]), proj(P3[name[1]]), { color, width: 2.5 });
      } else {
        let pos = P3.A;
        for (const [name, color] of vecs) {
          const next = add3(pos, sub3(P3[name[1]], P3[name[0]]));
          bd.arrow(proj(pos), proj(next), { color, width: 2.5 });
          pos = next;
        }
        bd.arrow(proj(P3.A), proj(pos), { color: C.sum, width: 4, opacity: 0.85, label: "합", labelSide: -1 });
      }
    };
    render();
  },

  // 단위 벡터: 원 위의 P를 끌면 같은 방향, 길이 1인 Q가 점선 단위원 위를 따라간다
  unit(box) {
    const bd = new Board(box, { xmin: -1.4, xmax: 4.4, ymin: -1.4, ymax: 4.4, width: 300 });
    bd.circle([2, 2], 2, { width: 2, layer: bd.bg });
    bd.circle([0, 0], 1, { color: C.faint, width: 1.3, dash: "5 5", layer: bd.bg });
    bd.point([0, 0], { label: "O", dx: -11, dy: 11, size: 15, layer: bd.bg });
    let phi = Math.PI * 0.75;
    const h = bd.handle([2, 2], { color: C.a, r: 12 });
    const render = () => {
      bd.clear();
      const P = [2 + 2 * Math.cos(phi), 2 + 2 * Math.sin(phi)];
      const Q = mul(1 / Math.hypot(...P), P);
      bd.line([0, 0], P, { color: C.faint, width: 1.2, dash: "4 4" });
      bd.arrow([0, 0], Q, { color: C.sum, width: 3 });
      bd.point(Q, { color: C.sum, r: 4.5, label: "Q", dx: -12, dy: -10, size: 15 });
      bd.point(P, { color: C.a, r: 4.5, label: "P", dx: 12, dy: -10, size: 15 });
      h.move(P);
    };
    bd.drag(h.el, { onMove: (w) => { phi = Math.atan2(w[1] - 2, w[0] - 2); render(); } });
    render();
  },
};

// 손잡이를 시작점에서 너무 멀어지지 않게 붙잡아 둔다 (판 밖으로 나가지 않게)
function clamp(w, origin, maxLen) {
  const d = sub(w, origin);
  const len = Math.hypot(...d) || 1;
  const k = Math.min(len, maxLen) / len;
  return [origin[0] + d[0] * k, origin[1] + d[1] * k];
}

function slider(box, { min, max, step, value, label }, onInput) {
  const wrap = document.createElement("label");
  wrap.className = "slider";
  const name = document.createElement("span");
  const input = document.createElement("input");
  Object.assign(input, { type: "range", min, max, step, value });
  const show = () => { name.innerHTML = `${label} = ${String(input.value).replace("-", "−")}`; };
  input.oninput = () => { show(); onInput(Number(input.value)); };
  show();
  wrap.append(name, input);
  box.appendChild(wrap);
  return input;
}

// 위젯이 달린 카드 한 장을 문자열로 돌려준다. 위젯은 mountConceptWidget()으로 붙인다.
export function conceptCard(p, key, { fmt }) {
  const c = CONCEPTS[key];
  if (!c) return "";
  const points = c.points.map((t) => `<li>${fmt(t)}</li>`).join("");
  return `
    <div class="concept-card">
      <div class="concept-head"><span class="concept-badge">📚 개념 카드</span><h2>${c.title}</h2></div>
      <p class="concept-tagline">${fmt(c.tagline)}</p>
      <div class="concept-body"><div class="concept-widget" data-key="${key}"></div><ul class="concept-points">${points}</ul></div>
    </div>`;
}

// 카드 문자열을 화면에 넣은 뒤 호출한다: data-key 칸에 인터랙티브 위젯을 만든다.
export function mountConceptWidget(key, box) {
  const make = WIDGETS[CONCEPTS[key]?.fig];
  if (!box || !make) return;
  box.replaceChildren();
  try { make(box); } catch {} // 위젯을 못 그려도 카드 학습은 계속할 수 있게
}
