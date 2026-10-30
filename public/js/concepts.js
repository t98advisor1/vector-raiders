// 개념 학습 카드: 문제 상자나 벡터 점프를 열기 전에 핵심 개념을 그림과 직관적 요약으로 먼저 보여 준다.
// 학습을 돕는 게 목적이라 정답 수치는 두지 않는다. 그림은 작은 인라인 SVG로 직접 그린다.
// key: 문제 id("p1"~"p7") 또는 벡터 실험실 단계 id("l1"~"l3" — 실험실은 l1·l2·l3만 카드가 있다).
export const CONCEPTS = {
  l1: {
    title: "삼각형법",
    tagline: "두 벡터를 '꼬리에 머리' 이어 붙이면, 시작점에서 끝점을 잇는 화살표가 합이에요.",
    points: [
      "{a}의 화살촉(끝점)에 {b}의 꼬리(시작점)를 붙여 놓아요.",
      "이으면 [AB]처럼 시작점에서 마지막 끝점으로 가는 벡터 하나가 남아요.",
      "순서를 바꿔 이어 붙여도 같은 곳에 도착해요. ({a}+{b} = {b}+{a})",
    ],
    fig: "triangle",
  },
  l2: {
    title: "평행사변형법",
    tagline: "두 벡터를 '꼬리에 꼬리' 모아 놓으면, 대각선이 합이에요.",
    points: [
      "{a}와 {b}를 같은 점에서 시작하게 나란히 놓아요.",
      "두 벡터를 변으로 하는 평행사변형을 상상해요.",
      "공통 시작점에서 반대쪽 꼭짓점으로 그은 대각선이 {a}+{b}예요.",
    ],
    fig: "parallelogram",
  },
  l3: {
    title: "실수배",
    tagline: "벡터에 실수를 곱하면 길이가 늘고 줄고, 음수면 방향이 반대가 돼요.",
    points: [
      "$2\\vv{a}$는 {a}와 같은 방향, 두 배 길이예요.",
      "$\\dfrac{1}{2}\\vv{a}$는 같은 방향, 절반 길이예요.",
      "$-\\vv{a}$는 크기는 같고 방향만 반대예요. ($-\\vv{a}$ = 뒤로 한 칸)",
    ],
    fig: "scale",
  },
  p1: {
    title: "같은 벡터 알아보기",
    tagline: "벡터는 '크기와 방향'이 같으면 위치와 상관없이 같은 벡터예요.",
    points: [
      "[BC]를 손으로 잡고 평행이동해 보세요. 시작점과 끝점이 딱 꼭짓점에 놓이면 같은 벡터예요.",
      "모양이 같아 보여도 방향이 다르면(→ vs ←) 다른 벡터예요.",
      "정육각형에서 마주 보는 변은 평행하고 길이가 같아요. 이 성질을 이용해 보세요.",
    ],
    fig: "translate",
  },
  p2: {
    title: "벡터의 뺄셈",
    tagline: "$\\VV{MN}-\\VV{MB}$는 $\\VV{MN}+\\VV{BM}$로 바꿔 이어 붙일 수 있어요.",
    points: [
      "$-\\VV{MB}$는 [MB]를 뒤집은 [BM]이에요. 빼기는 '방향 뒤집아 더하기'로!",
      "$\\VV{BM}+\\VV{MN}$: 꼬리에 머리로 이어 붙이면 [BN] 한 개로 정리돼요.",
      "한 변의 길이를 $a$로 놓으면 $\\VV{MN}$, $\\VV{BM}$의 길이가 $\\dfrac{a}{2}$, $a$로 나타나요.",
    ],
    fig: "subtract",
  },
  p3: {
    title: "벡터의 실수배 합으로 나타내기",
    tagline: "$\\VV{OC}=m\\vv{a}+n\\vv{b}$는 {a} 방향과 {b} 방향으로 각각 얼마씩 가는지로 쪼개는 일이에요.",
    points: [
      "점 C에서 OA, OB에 수직선을 내리면 두 조각으로 나눠져요.",
      "{a} 방향 조각의 길이는 $6m$, {b} 방향 조각은 $6n$이 돼요.",
      "직각삼각형에서 $30^{\\circ}$, $60^{\\circ}$를 쓰면 $m$, $n$이 나와요.",
    ],
    fig: "decompose",
  },
  p4: {
    title: "두 벡터가 평행한 조건",
    tagline: "$\\vv{x} \\parallel \\vv{y}$ ⟺ $\\vv{x}=k\\vv{y}$인 실수 $k$가 있어요.",
    points: [
      "평행하면 한 벡터를 다른 벡터의 실수배로 쓸 수 있어요.",
      "$\\vv{p}+\\vv{q}$와 $\\vv{q}-\\vv{r}$을 각각 $\\vv{a}$, $\\vv{b}$로 정리해요.",
      "$\\vv{q}-\\vv{r}=k(\\vv{p}+\\vv{q})$로 놓고 양변에서 $\\vv{a}$, $\\vv{b}$의 계수를 비교하면 돼요.",
    ],
    fig: "parallel",
  },
  p5: {
    title: "세 점이 한 직선 위에 있는 조건",
    tagline: "$\\VV{OC}=s\\vv{a}+t\\vv{b}$일 때, 세 점 A·B·C가 일직선이면 $s+t=1$이에요.",
    points: [
      "C가 직선 AB 위에 있으면 $\\VV{AC}=k\\VV{AB}$로 쓸 수 있어요.",
      "이를 정리하면 $\\VV{OC}=(1-k)\\vv{a}+k\\vv{b}$ — 계수를 합하면 $1$이에요.",
      "반대로 계수의 합이 1이면 C는 직선 AB 위에 있어요.",
    ],
    fig: "collinear",
  },
  p6: {
    title: "벡터를 이어 붙여 합 구하기",
    tagline: "여러 벡터의 합은 차례로 이어 붙이면 '시작점 → 끝점' 한 개로 남아요.",
    points: [
      "$\\VV{AG}+\\VV{BH}+\\VV{CE}+\\VV{DF}$: 각 벡터를 가로·세로·높이 방향 성분으로 분해해요.",
      "같은 방향으로 가는 성분끼리는 서로 지워져요. (오른쪽으로 a, 왼쪽으로 a → 0)",
      "남는 건 높이 방향뿐! [GC]와 방향(위? 아래?)을 비교해 계수를 정하세요.",
    ],
    fig: "chain",
  },
  p7: {
    title: "단위 벡터와 점의 자취",
    tagline: "$\\dfrac{\\VV{OP}}{|\\VV{OP}|}$는 '같은 방향, 길이 1'인 단위 벡터예요.",
    points: [
      "점 P가 어디 있든 Q는 항상 원점에서 거리 1인 점이에요.",
      "그래서 Q의 자취는 원점을 중심으로 하는 원(호) 위에 있어요.",
      "원점에서 원에 그은 두 접선 사이의 각이 자취가 되는 호의 중심각이에요.",
    ],
    fig: "unit",
  },
};

// 작은 그림: 120×90 크기의 인라인 SVG를 돌려준다. 화살표는 마커로 그린다.
const ARROW = (id, color) =>
  `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker>`;

function figure(kind) {
  const A = "#2563eb", B = "#ea580c", S = "#0f766e";
  const svg = (inner, defs = "") =>
    `<svg class="concept-fig" viewBox="0 0 120 90" width="120" height="90" aria-hidden="true">${defs}${inner}</svg>`;
  const arrow = (x1, y1, x2, y2, color, id) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2.5" marker-end="url(#${id})" stroke-linecap="round"/>`;
  const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#1f2937"/>`;
  const label = (x, y, t, color = "#1f2937") => `<text x="${x}" y="${y}" font-size="9" font-style="italic" fill="${color}" text-anchor="middle">${t}</text>`;

  switch (kind) {
    case "triangle":
      return svg(arrow(20, 70, 60, 40, A, "fa") + arrow(60, 40, 100, 55, B, "fb") + `<line x1="20" y1="70" x2="96" y2="56" stroke="${S}" stroke-width="2.5" stroke-dasharray="4 3"/>` + dot(20, 70) + dot(60, 40) + label(17, 80, "P") + label(60, 33, "Q") + label(103, 62, "R") + label(58, 76, `${"{a}+{b}"}`, S), ARROW("fa", A) + ARROW("fb", B));
    case "parallelogram":
      return svg(`<rect x="20" y="25" width="60" height="40" fill="none" stroke="#c7bfae" stroke-width="1.5"/>` + arrow(20, 65, 80, 65, A, "pa") + arrow(20, 65, 20, 25, B, "pb") + arrow(20, 65, 80, 25, S, "ps") + dot(20, 65) + label(50, 76, "{a}", A) + label(11, 46, "{b}", B) + label(56, 20, "{a}+{b}", S), ARROW("pa", A) + ARROW("pb", B) + ARROW("ps", S));
    case "scale":
      return svg(arrow(15, 70, 55, 70, A, "sa") + arrow(15, 45, 95, 45, A, "sb") + arrow(75, 70, 35, 70, "#a855f7", "sc") + label(35, 81, "{a}", A) + label(56, 37, "2{a}", A) + label(55, 81, "−{a}", "#a855f7"), ARROW("sa", A) + ARROW("sb", A) + ARROW("sc", "#a855f7"));
    case "translate":
      return svg(`<rect x="15" y="20" width="90" height="50" fill="none" stroke="#c7bfae" stroke-width="1.2"/>` + arrow(30, 30, 55, 30, A, "ta") + arrow(60, 55, 85, 55, A, "tb") + `<line x1="30" y1="30" x2="60" y2="55" stroke="#c7bfae" stroke-width="1" stroke-dasharray="3 3"/><line x1="55" y1="30" x2="85" y2="55" stroke="#c7bfae" stroke-width="1" stroke-dasharray="3 3"/>` + label(42, 24, "[BC]", A) + label(72, 68, "[XX]′", A), ARROW("ta", A) + ARROW("tb", A));
    case "subtract":
      return svg(arrow(20, 70, 50, 30, A, "da") + arrow(20, 70, 75, 70, B, "db") + arrow(75, 70, 50, 30, S, "ds") + dot(20, 70) + dot(75, 70) + label(50, 24, "N") + label(14, 80, "M") + label(80, 80, "B") + label(66, 46, "−", S), ARROW("da", A) + ARROW("db", B) + ARROW("ds", S));
    case "decompose":
      return svg(`<path d="M 20 70 A 55 55 0 0 0 75 15" fill="none" stroke="#c7bfae" stroke-width="1.2"/>` + arrow(20, 70, 60, 70, A, "ea") + arrow(20, 70, 20, 25, B, "eb") + arrow(20, 70, 52, 31, S, "ec") + `<line x1="52" y1="31" x2="52" y2="70" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/><line x1="52" y1="31" x2="20" y2="31" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"/>` + dot(20, 70) + label(40, 81, "m{a}", A) + label(9, 50, "n{b}", B) + label(62, 27, "C", S), ARROW("ea", A) + ARROW("eb", B) + ARROW("ec", S));
    case "parallel":
      return svg(arrow(15, 30, 70, 22, S, "fa2") + arrow(15, 65, 75, 56, S, "fb2") + `<line x1="15" y1="30" x2="110" y2="17" stroke="#c7bfae" stroke-width="1" stroke-dasharray="4 3"/><line x1="15" y1="65" x2="112" y2="55" stroke="#c7bfae" stroke-width="1" stroke-dasharray="4 3"/>` + label(88, 14, "k·( )", "#6b7280"), ARROW("fa2", S) + ARROW("fb2", S));
    case "collinear":
      return svg(`<line x1="10" y1="60" x2="112" y2="38" stroke="#c7bfae" stroke-width="1.2"/>` + dot(25, 57) + dot(60, 49) + dot(95, 42) + label(25, 70, "A") + label(60, 62, "B") + label(97, 55, "C") + label(60, 22, "계수의 합 = 1", S));
    case "chain":
      return svg(arrow(20, 65, 50, 65, A, "ca") + arrow(50, 65, 50, 35, B, "cb") + arrow(20, 65, 20, 30, A, "cc") + arrow(20, 30, 50, 30, B, "cd") + arrow(20, 65, 47, 27, S, "ce") + label(35, 76, "{x}") + label(58, 52, "{y}") + label(60, 22, "합", S), ARROW("ca", A) + ARROW("cb", B) + ARROW("cc", A) + ARROW("cd", B) + ARROW("ce", S));
    case "unit":
      return svg(`<circle cx="35" cy="55" r="25" fill="none" stroke="#c7bfae" stroke-width="1.5"/><circle cx="60" cy="45" r="12" fill="none" stroke="${S}" stroke-width="1.8"/>` + dot(60, 45) + dot(72, 45) + label(60, 67, "O") + label(76, 40, "Q") + label(20, 20, "길이 1의 자취", S));
    default:
      return "";
  }
}

// 카드 한 장을 root에 채운다. root는 element(또는 null — 문자열만 필요할 때).
export function conceptCard(p, key, { fmt }) {
  const c = CONCEPTS[key];
  if (!c) return "";
  const points = c.points.map((t) => `<li>${fmt(t)}</li>`).join("");
  return `
    <div class="concept-card">
      <div class="concept-head"><span class="concept-badge">📚 개념 카드</span><h2>${c.title}</h2></div>
      <p class="concept-tagline">${fmt(c.tagline)}</p>
      <div class="concept-body">${c.fig ? figure(c.fig) : ""}<ul class="concept-points">${points}</ul></div>
    </div>`;
}
