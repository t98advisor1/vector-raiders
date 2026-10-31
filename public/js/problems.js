// 유물 퀴즈: 미래엔 기하 Ⅲ-1 '벡터의 연산' 교과서 예제, 중단원 마무리, 수능 4점 기출 연계 문제.
// 정답은 서버(src/answers.js)에만 있다. 여기에는 문제, 힌트, 확인 도구만 둔다.
// 확인 도구는 관계를 보여 줄 뿐 정답 수치를 직접 보여 주지 않는다.
// 모든 문제는 문장이 타자 소리와 함께 찍히고, 그림이 저절로 움직이는 모션 그래픽으로 시작한다(ui.autoplay).
// 학생이 그림이나 슬라이더를 만지면 자동 재생이 멈추고 직접 조작한다.
import { Board, C, el, add, sub, mul, dist } from "./svg.js";
import { fmt } from "./mathtext.js";

// 2022 개정 교육과정 기하 3단원 벡터 단원 체계 (3-1, 3-2, 3-3)
export const UNITS = [
  { id: "3-1", name: "3-1. 벡터의 연산", desc: "벡터의 덧셈·뺄셈과 실수배, 위치벡터", short: "벡터의 연산", default: true },
  { id: "3-2", name: "3-2. 벡터의 성분과 내적", desc: "평면벡터의 성분과 두 벡터의 내적, 각의 크기", short: "성분과 내적" },
  { id: "3-3", name: "3-3. 도형의 방정식", desc: "직선의 방정식과 원의 방정식, 평면운동", short: "도형의 방정식" },
];

// 난이도 3가지: 초심자용(하, 70점) · 기본형(중, 100점) · 심화형(상, 150점, 수능형/2인 협동)
export const DIFFICULTY = [
  { key: "low", name: "초심자용", points: 70, desc: "교과서 기초 예제 및 상등 탐색" },
  { key: "mid", name: "기본형", points: 100, desc: "교과서 중단원 표준 완성" },
  { key: "high", name: "심화 수능형", points: 150, desc: "수능 4점 기출 ㄱ·ㄴ·ㄷ 및 2인 협동 레이드" },
];

export const PROBLEMS = [
  {
    id: "p1", relic: "육각 방패", icon: "🛡️", level: "기본", source: "중단원 01번 유사",
    diffs: {
      low: {
        level: "초심자 교과서 예제", points: 70, source: "교과서 예제 1번",
        text: "오른쪽 그림과 같은 정육각형 ABCDEF에서 세 대각선의 교점을 O라 하자. 벡터 [AB]와 크기와 방향이 모두 같은 벡터를 보기에서 모두 고르시오.",
        answer: { kind: "multi", options: ["FO", "OC", "ED", "BC", "EF", "BO", "OD"] },
        hint: "크기와 방향이 같으면 같은 벡터예요. [AB]를 평행이동했을 때 완전히 겹치는 벡터 3개를 골라보세요.",
      },
      mid: {
        level: "중단원 표준", points: 100, source: "중단원 01번 유사",
        text: "오른쪽 그림과 같은 정육각형 ABCDEF에서 세 대각선 AD, BE, CF의 교점을 O라 할 때, 벡터 [BC]와 같은 벡터를 보기에서 모두 고르시오.",
        answer: { kind: "multi", options: ["AO", "CO", "DE", "FE", "OD", "EF", "BO"] },
        hint: "같은 벡터는 크기와 방향이 같아요. [BC]를 평행이동했을 때 시점과 종점이 모두 꼭짓점(또는 O)에 놓이는 경우를 찾아보세요.",
      },
      high: {
        level: "심화 수능 기출", points: 150, source: "수능 기하 4점 기출 합답형",
        text: "정육각형 ABCDEF에서 세 대각선의 교점을 O라 하자. <보기>에서 옳은 것만을 있는 대로 고른 것은?\n\n[보기]\nㄱ. [AB] + [AF] = [AO]\nㄴ. [AC] + [AE] = 3[AO]\nㄷ. |[AB] + [BC] + [CD]| = |[AD]|",
        answer: { kind: "choice", options: ["① ㄱ", "② ㄱ, ㄴ", "③ ㄱ, ㄷ", "④ ㄴ, ㄷ", "⑤ ㄱ, ㄴ, ㄷ"], valueKey: ["1", "2", "3", "4", "5"] },
        hint: "ㄱ: 평행사변형법에 의해 [AB]+[AF]=[AO] (참). ㄴ: [AC]=[AO]+[AB], [AE]=[AO]+[AF]를 대입해 보세요. ㄷ: 연속 벡터의 합은 [AD]가 돼요.",
      },
    },
    text: "오른쪽 그림과 같은 정육각형 ABCDEF에서 세 대각선 AD, BE, CF의 교점을 O라 할 때, 벡터 [BC]와 같은 벡터를 보기에서 모두 고르시오.",
    answer: { kind: "multi", options: ["AO", "CO", "DE", "FE", "OD", "EF", "BO"] },
    toolHelp: "빨간 점선 벡터의 시점(동그라미)을 끌어 꼭짓점이나 O에 놓아 보세요. [BC]를 평행이동한 벡터예요.",
    hint: "같은 벡터는 크기와 방향이 같아요. [BC]를 평행이동했을 때 시점과 종점이 모두 꼭짓점(또는 O)에 놓이는 경우를 찾아보세요.",
    tool: hexTool,
  },
  {
    id: "p2", relic: "사각 나침반", icon: "🧭", level: "표준", source: "중단원 07번 유사",
    diffs: {
      low: {
        level: "초심자 교과서 예제", points: 70, source: "교과서 예제 2번",
        text: "한 변의 길이가 4인 정사각형 ABCD에서 변 AB의 중점을 M이라 할 때, 벡터 [MB]의 크기 |[MB]|를 구하시오.",
        answer: { kind: "expr", label: "|MB| =" },
        hint: "M은 변 AB의 중점이에요. 한 변의 길이가 4이므로 중점까지의 거리는 절반이에요.",
      },
      mid: {
        level: "중단원 표준", points: 100, source: "중단원 07번 유사",
        text: "오른쪽 정사각형 ABCD에서 변 AB의 중점을 M, 변 AD의 중점을 N이라 하자. $|\\VV{MN}-\\VV{MB}|=2\\sqrt{5}$일 때, 이 정사각형의 한 변의 길이를 구하시오.",
        answer: { kind: "expr", label: "한 변의 길이 =" },
        hint: "$\\VV{MN}-\\VV{MB}=\\VV{MN}+\\VV{BM}=\\VV{BM}+\\VV{MN}$이에요. 이어 붙이면 어떤 벡터가 되는지 보고, 한 변의 길이를 $a$로 놓고 그 크기를 구해 보세요.",
      },
      high: {
        level: "심화 2인 협동 레이드", points: 150, source: "수능 기하 4점 변형 · 2인 협동", coop: true,
        text: "🤝 [2인 팀 협동 레이드] 같은 팀원 2명이 함께 이 상자 주변에 모여야 도전할 수 있습니다!\n\n한 변의 길이가 4인 정사각형 ABCD에서 두 팀원의 위치벡터를 각각 [p₁], [p₂]라 하자. 두 팀원이 변 BC와 CD 위를 각각 움직일 때, |[p₁]+[p₂]|의 최댓값을 구하시오. (단, 시점은 점 A)",
        answer: { kind: "expr", label: "최댓값 =" },
        hint: "두 팀원이 점 C에서 만날 때 두 벡터의 합의 크기가 최대가 돼요. |2[AC]| = 2 × 4 = 8이에요.",
      },
    },
    text: "오른쪽 정사각형 ABCD에서 변 AB의 중점을 M, 변 AD의 중점을 N이라 하자. $|\\VV{MN}-\\VV{MB}|=2\\sqrt{5}$일 때, 이 정사각형의 한 변의 길이를 구하시오.",
    answer: { kind: "expr", label: "한 변의 길이 =" },
    toolHelp: "주황 점선 벡터 $-\\VV{MB}$의 시점을 끌어 꼭짓점 B에 놓아 보세요.",
    hint: "$\\VV{MN}-\\VV{MB}=\\VV{MN}+\\VV{BM}=\\VV{BM}+\\VV{MN}$이에요. 이어 붙이면 어떤 벡터가 되는지 보고, 한 변의 길이를 $a$로 놓고 그 크기를 구해 보세요.",
    tool: squareTool,
  },
  {
    id: "p3", relic: "부채꼴 부채", icon: "🪭", level: "표준", source: "중단원 08번 유사",
    diffs: {
      low: {
        level: "초심자 교과서 예제", points: 70, source: "교과서 예제 3번",
        text: "반지름의 길이가 6이고 중심각의 크기가 90°인 부채꼴 OAB에서 두 벡터 [OA]와 [OB]의 내적 [OA] · [OB]의 값을 구하시오.",
        answer: { kind: "expr", label: "OA · OB =" },
        hint: "두 벡터가 이루는 각이 90°(직각)이면 cos 90° = 0이므로 내적의 값은 얼마일까요?",
      },
      mid: {
        level: "중단원 표준", points: 100, source: "중단원 08번 유사",
        text: "반지름의 길이가 $6$이고 중심각의 크기가 $90^\\circ$인 부채꼴 OAB의 호 AB 위의 점 C에 대하여 $\\VV{OA}=\\vv{a}$, $\\VV{OB}=\\vv{b}$, $\\VV{OC}=m\\vv{a}+n\\vv{b}$라 하자. $\\angle\\mathrm{AOC}=30^\\circ$일 때, 두 실수 $m$, $n$에 대하여 $m^2-n^2$의 값을 구하시오.",
        answer: { kind: "expr", label: "m² − n² =" },
        hint: "C에서 OA, OB에 수선을 내리면 직각삼각형이 생겨요. $|m\\vv{a}|=6m$, $|n\\vv{b}|=6n$이 각각 $6\\cos 30^\\circ$, $6\\sin 30^\\circ$와 같아요.",
      },
      high: {
        level: "심화 수능 기출", points: 150, source: "수능 기하 4점 기출 합답형",
        text: "반지름의 길이가 6인 부채꼴 OAB (∠AOB=90°)의 호 위의 점 C에 대하여 <보기>에서 옳은 것만을 있는 대로 고른 것은?\n\n[보기]\nㄱ. [OA] · [OB] = 0\nㄴ. |[OC]|² = 36\nㄷ. [OC] · ([OA]+[OB])의 최댓값은 36√2이다.",
        answer: { kind: "choice", options: ["① ㄱ", "② ㄱ, ㄴ", "③ ㄱ, ㄷ", "④ ㄴ, ㄷ", "⑤ ㄱ, ㄴ, ㄷ"], valueKey: ["1", "2", "3", "4", "5"] },
        hint: "ㄱ: 직교하므로 0 (참). ㄴ: 반지름 6이므로 크기 제곱은 36 (참). ㄷ: [OA]+[OB] 방향과 일치할 때 내적이 최대가 돼요 (참).",
      },
    },
    text: "반지름의 길이가 $6$이고 중심각의 크기가 $90^\\circ$인 부채꼴 OAB의 호 AB 위의 점 C에 대하여 $\\VV{OA}=\\vv{a}$, $\\VV{OB}=\\vv{b}$, $\\VV{OC}=m\\vv{a}+n\\vv{b}$라 하자. $\\angle\\mathrm{AOC}=30^\\circ$일 때, 두 실수 $m$, $n$에 대하여 $m^2-n^2$의 값을 구하시오.",
    answer: { kind: "expr", label: "m² − n² =" },
    toolHelp: "점 C를 호 위에서 움직이면 $\\VV{OC}$가 $m\\vv{a}$와 $n\\vv{b}$로 나뉘는 모습이 보여요.",
    hint: "C에서 OA, OB에 수선을 내리면 직각삼각형이 생겨요. $|m\\vv{a}|=6m$, $|n\\vv{b}|=6n$이 각각 $6\\cos 30^\\circ$, $6\\sin 30^\\circ$와 같아요.",
    tool: sectorTool,
  },
  {
    id: "p4", relic: "평행 쌍검", icon: "⚔️", level: "표준", source: "중단원 10번 유사",
    diffs: {
      low: {
        level: "초심자 교과서 예제", points: 70, source: "교과서 예제 4번",
        text: "두 벡터 [a]=(2, 1), [b]=(4, m)이 서로 평행하도록 하는 실수 m의 값을 구하시오.",
        answer: { kind: "expr", label: "m =" },
        hint: "두 벡터가 평행하면 x성분과 y성분의 비가 서로 같아요. 2/4 = 1/m에서 m을 구해 보세요.",
      },
      mid: {
        level: "중단원 표준", points: 100, source: "중단원 10번 유사",
        text: "영벡터가 아니고 서로 평행하지 않은 두 벡터 $\\vv{a}$, $\\vv{b}$에 대하여 $\\vv{p}=2\\vv{a}-3\\vv{b}$, $\\vv{q}=-\\vv{a}+\\vv{b}$, $\\vv{r}=m\\vv{a}-3\\vv{b}$일 때, 두 벡터 $\\vv{p}+\\vv{q}$와 $\\vv{q}-\\vv{r}$가 서로 평행하도록 하는 실수 $m$의 값을 구하시오.",
        answer: { kind: "expr", label: "m =" },
        hint: "$\\vv{p}+\\vv{q}$와 $\\vv{q}-\\vv{r}$를 각각 $\\vv{a}$, $\\vv{b}$로 정리한 뒤, $\\vv{q}-\\vv{r}=k(\\vv{p}+\\vv{q})$로 놓고 $\\vv{a}$, $\\vv{b}$의 계수를 비교해 보세요.",
      },
      high: {
        level: "심화 2인 협동 레이드", points: 150, source: "수능 기하 4점 변형 · 2인 협동", coop: true,
        text: "🤝 [2인 팀 협동 레이드] 같은 팀원 2명이 함께 모여 힘을 합쳐야 풀 수 있습니다!\n\n평면 위의 두 벡터 [a], [b]에 대하여 두 팀원이 조작하는 벡터 [v₁]=3[a]+2[b], [v₂]=m[a]-4[b]가 서로 평행하고 반대 방향을 가리키도록 하는 실수 m의 값을 구하시오.",
        answer: { kind: "expr", label: "m =" },
        hint: "두 벡터가 평행하면 3/m = 2/(-4)가 성립해요. 반대 방향이므로 m은 음수예요.",
      },
    },
    text: "영벡터가 아니고 서로 평행하지 않은 두 벡터 $\\vv{a}$, $\\vv{b}$에 대하여 $\\vv{p}=2\\vv{a}-3\\vv{b}$, $\\vv{q}=-\\vv{a}+\\vv{b}$, $\\vv{r}=m\\vv{a}-3\\vv{b}$일 때, 두 벡터 $\\vv{p}+\\vv{q}$와 $\\vv{q}-\\vv{r}$가 서로 평행하도록 하는 실수 $m$의 값을 구하시오.",
    answer: { kind: "expr", label: "m =" },
    toolHelp: "슬라이더로 $m$을 바꾸면 $\\vv{q}-\\vv{r}$가 움직여요. 보라색 점선은 $\\vv{p}+\\vv{q}$의 방향이에요.",
    hint: "$\\vv{p}+\\vv{q}$와 $\\vv{q}-\\vv{r}$를 각각 $\\vv{a}$, $\\vv{b}$로 정리한 뒤, $\\vv{q}-\\vv{r}=k(\\vv{p}+\\vv{q})$로 놓고 $\\vv{a}$, $\\vv{b}$의 계수를 비교해 보세요.",
    tool: parallelTool,
  },
  {
    id: "p5", relic: "일직선 창", icon: "🔱", level: "표준", source: "중단원 11번 유사",
    diffs: {
      low: {
        level: "초심자 교과서 예제", points: 70, source: "교과서 예제 5번",
        text: "서로 다른 세 점 O, A, B에 대하여 [OC] = m[OA] + (1-m)[OB]일 때, 실수 m=3이면 세 점 A, B, C는 한 직선 위에 있다. (옳으면 1, 틀리면 0을 입력)",
        answer: { kind: "expr", label: "정답 =" },
        hint: "[OA]와 [OB]의 계수의 합이 m + (1-m) = 1이므로 점 C는 항상 직선 AB 위에 있어요.",
      },
      mid: {
        level: "중단원 표준", points: 100, source: "중단원 11번 유사",
        text: "평면 위의 서로 다른 네 점 O, A, B, C에 대하여 $\\VV{OA}=\\vv{a}$, $\\VV{OB}=\\vv{b}$, $\\VV{OC}=2m\\vv{a}+(m-5)\\vv{b}$일 때, 세 점 A, B, C가 한 직선 위에 있도록 하는 실수 $m$의 값을 구하시오. (단, $\\vv{a}$와 $\\vv{b}$는 영벡터가 아니고 서로 평행하지 않다.)",
        answer: { kind: "expr", label: "m =" },
        hint: "$\\VV{AC}=t\\VV{AB}$인 실수 $t$가 있어야 해요. 그러면 $\\VV{OC}=(1-t)\\vv{a}+t\\vv{b}$이므로 $\\vv{a}$, $\\vv{b}$의 계수의 합은 얼마일까요?",
      },
      high: {
        level: "심화 수능 기출", points: 150, source: "수능 기하 4점 기출 합답형",
        text: "평면 위의 서로 다른 네 점 O, A, B, C에 대하여 <보기>에서 옳은 것만을 있는 대로 고른 것은?\n\n[보기]\nㄱ. [OC] = 1/3[OA] + 2/3[OB]이면 점 C는 선분 AB를 2:1로 내분한다.\nㄴ. 세 점 A, B, C가 한 직선 위에 있을 필요충분조건은 [OC]=s[OA]+t[OB]에서 s+t=1이다.\nㄷ. [OC]=2[OA]-[OB]이면 점 A는 선분 BC의 중점이다.",
        answer: { kind: "choice", options: ["① ㄱ", "② ㄱ, ㄴ", "③ ㄱ, ㄷ", "④ ㄴ, ㄷ", "⑤ ㄱ, ㄴ, ㄷ"], valueKey: ["1", "2", "3", "4", "5"] },
        hint: "ㄱ: 내분점 공식 m/(m+n)을 확인하세요. ㄴ: 계수 합=1 조건은 일직선 필요충분조건이에요. ㄷ: [OA]=([OB]+[OC])/2가 되므로 A는 중점이에요.",
      },
    },
    text: "평면 위의 서로 다른 네 점 O, A, B, C에 대하여 $\\VV{OA}=\\vv{a}$, $\\VV{OB}=\\vv{b}$, $\\VV{OC}=2m\\vv{a}+(m-5)\\vv{b}$일 때, 세 점 A, B, C가 한 직선 위에 있도록 하는 실수 $m$의 값을 구하시오. (단, $\\vv{a}$와 $\\vv{b}$는 영벡터가 아니고 서로 평행하지 않다.)",
    answer: { kind: "expr", label: "m =" },
    toolHelp: "슬라이더로 $m$을 바꾸면 점 C가 움직이고, 지나간 자리가 점으로 남아요.",
    hint: "$\\VV{AC}=t\\VV{AB}$인 실수 $t$가 있어야 해요. 그러면 $\\VV{OC}=(1-t)\\vv{a}+t\\vv{b}$이므로 $\\vv{a}$, $\\vv{b}$의 계수의 합은 얼마일까요?",
    tool: collinearTool,
  },
  {
    id: "p6", relic: "정육면체 상자", icon: "📦", level: "발전", source: "중단원 13번 유사",
    diffs: {
      low: {
        level: "초심자 교과서 예제", points: 70, source: "교과서 예제 6번",
        text: "한 모서리의 길이가 2인 정육면체 ABCD-EFGH에서 벡터 [AE]의 크기 |[AE]|를 구하시오.",
        answer: { kind: "expr", label: "|AE| =" },
        hint: "정육면체의 모서리의 길이는 모두 같아요. 한 모서리의 길이가 2예요.",
      },
      mid: {
        level: "중단원 표준", points: 100, source: "중단원 13번 유사",
        text: "다음 그림과 같은 직육면체 ABCD-EFGH에서 $\\VV{AG}+\\VV{BH}+\\VV{CE}+\\VV{DF}=m\\VV{GC}$를 만족시키는 실수 $m$의 값을 구하시오.",
        answer: { kind: "expr", label: "m =" },
        hint: "네 벡터를 가로, 세로, 높이 방향으로 나누어 보세요. 가로·세로 방향은 서로 지워지고 높이 방향만 남아요. [GC]의 방향(위? 아래?)에 주의하세요.",
      },
      high: {
        level: "심화 수능 기출", points: 150, source: "수능 기하 4점 기출 공간도형",
        text: "한 모서리의 길이가 2인 정육면체 ABCD-EFGH에서 대각선 벡터 [AG]와 면 대각선 벡터 [AC]의 내적 [AG] · [AC]의 값을 구하시오.",
        answer: { kind: "expr", label: "내적 =" },
        hint: "[AG]=[AC]+[CG]이고 [CG]는 밑면과 수직이므로 [AC] · [CG] = 0이에요. 따라서 [AG] · [AC] = |[AC]|² = 2² + 2² = 8...이 아니라 모서리 2,3,4 직육면체 연계!",
      },
    },
    text: "다음 그림과 같은 직육면체 ABCD-EFGH에서 $\\VV{AG}+\\VV{BH}+\\VV{CE}+\\VV{DF}=m\\VV{GC}$를 만족시키는 실수 $m$의 값을 구하시오.",
    answer: { kind: "expr", label: "m =" },
    toolHelp: "그림을 끌면 돌아가요. '이어 붙이기'를 누르면 네 벡터를 화살촉에 시점을 이어 차례로 연결해요.",
    hint: "네 벡터를 가로, 세로, 높이 방향으로 나누어 보세요. 가로·세로 방향은 서로 지워지고 높이 방향만 남아요. [GC]의 방향(위? 아래?)에 주의하세요.",
    tool: cuboidTool,
  },
  {
    id: "p7", relic: "원형 거울", icon: "🪞", level: "발전", source: "중단원 15번 유사",
    diffs: {
      low: {
        level: "초심자 교과서 예제", points: 70, source: "교과서 예제 7번",
        text: "원 (x-1)² + (y-2)² = 9 위의 점 P에 대하여, 중심 C(1, 2)에서 점 P까지의 거리(원의 반지름)를 구하시오.",
        answer: { kind: "expr", label: "반지름 r =" },
        hint: "원의 방정식 (x-a)² + (y-b)² = r²에서 r² = 9이므로 반지름 r은 얼마일까요?",
      },
      mid: {
        level: "중단원 표준", points: 100, source: "중단원 15번 유사",
        text: "원 $(x-2)^2+(y-2)^2=4$ 위를 움직이는 점 P에 대하여 $\\VV{OQ}=\\dfrac{\\VV{OP}}{|\\VV{OP}|}$를 만족시키는 점 Q가 나타내는 도형의 길이를 구하시오. (단, O는 원점)",
        answer: { kind: "expr", label: "길이 =" },
        hint: "Q는 원점에서 P 쪽으로 거리 1인 점이에요. 원점에서 원에 그은 두 접선 사이의 각을 구하면 Q가 움직이는 호의 중심각이 돼요.",
      },
      high: {
        level: "심화 수능 기출", points: 150, source: "수능 기하 4점 기출 자취",
        text: "원 (x-3)² + (y-4)² = 4 위를 움직이는 점 P와 원점 O에 대하여 벡터 [OP]의 크기의 최댓값 M과 최솟값 m의 곱 M × m의 값을 구하시오.",
        answer: { kind: "expr", label: "M × m =" },
        hint: "원점 O에서 원의 중심 C(3, 4)까지 거리는 d = √(3²+4²) = 5, 반지름은 r = 2예요. M = d+r = 7, m = d-r = 3이므로 곱을 구하세요.",
      },
    },
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

function hexTool(ui) {
  const r3 = Math.sqrt(3) / 2;
  const P = {
    O: [0, 0], A: [-0.5, r3], B: [-1, 0], C: [-0.5, -r3],
    D: [0.5, -r3], E: [1, 0], F: [0.5, r3],
  };
  const bd = new Board(ui.board, { xmin: -1.5, xmax: 1.5, ymin: -1.2, ymax: 1.2, width: 260 });
  const poly = [P.A, P.B, P.C, P.D, P.E, P.F];
  bd.poly(poly, { fill: C.roomHex, stroke: C.axis, width: 2 });
  bd.seg(P.A, P.D, { stroke: C.axis, width: 1, dash: "3 3" });
  bd.seg(P.B, P.E, { stroke: C.axis, width: 1, dash: "3 3" });
  bd.seg(P.C, P.F, { stroke: C.axis, width: 1, dash: "3 3" });
  for (const [k, p] of Object.entries(P)) {
    const dx = p[0] === 0 ? 0 : p[0] < 0 ? -12 : 12;
    const dy = p[1] === 0 ? 12 : p[1] < 0 ? -12 : 12;
    bd.point(p, { label: k, dx, dy });
  }
  bd.arrow(P.B, P.C, { color: C.ans, width: 3.5, label: "[BC]" });

  let cur = P.B;
  const ghost = bd.arrow(P.B, P.C, { color: C.ans, width: 2.5, dash: "5 3" });
  const h = bd.handle(cur, { color: C.ans, r: 12 });
  const update = (p) => {
    const d = sub(P.C, P.B);
    ghost.setAttribute("x1", bd.toSvg(p)[0]);
    ghost.setAttribute("y1", bd.toSvg(p)[1]);
    const end = add(p, d);
    ghost.setAttribute("x2", bd.toSvg(end)[0]);
    ghost.setAttribute("y2", bd.toSvg(end)[1]);
    h.move(p);
    const snap = Object.entries(P).find(([, q]) => dist(p, q) < 0.18);
    const endSnap = snap ? Object.entries(P).find(([, q]) => dist(add(snap[1], d), q) < 0.18) : null;
    if (snap && endSnap) info(ui, `시점 ${snap[0]}에 놓으면 종점은 ${endSnap[0]}이에요. $\\VV{${snap[0]}${endSnap[0]}} = \\VV{BC}$!`);
    else if (snap) info(ui, `시점 ${snap[0]}에 놓았지만 종점이 꼭짓점이 아니에요.`);
    else info(ui, "시점(동그라미)을 꼭짓점이나 O에 끌어다 놓아 보세요.");
  };
  bd.drag(h.el, {
    onMove: (w) => {
      let snap = w;
      for (const p of Object.values(P)) if (dist(w, p) < 0.18) { snap = p; break; }
      cur = snap;
      update(cur);
    },
  });
  update(cur);
}

function squareTool(ui) {
  const bd = new Board(ui.board, { xmin: -0.5, xmax: 4.5, ymin: -0.5, ymax: 4.5, width: 260 });
  const A = [0, 4], B = [0, 0], C = [4, 0], D = [4, 4];
  const M = [0, 2], N = [2, 4];
  bd.poly([A, B, C, D], { fill: C.roomHex, stroke: C.axis, width: 2 });
  bd.point(A, { label: "A", dx: -10, dy: 10 });
  bd.point(B, { label: "B", dx: -10, dy: -10 });
  bd.point(C, { label: "C", dx: 10, dy: -10 });
  bd.point(D, { label: "D", dx: 10, dy: 10 });
  bd.point(M, { label: "M", dx: -12, dy: 0, color: C.a });
  bd.point(N, { label: "N", dx: 0, dy: 12, color: C.b });
  bd.arrow(M, N, { color: C.a, width: 3, label: "[MN]" });
  bd.arrow(M, B, { color: C.b, width: 3, label: "[MB]" });

  let placed = false;
  const neg = bd.arrow(M, A, { color: C.sum, width: 3, dash: "5 3" });
  const sum = bd.arrow(B, N, { color: C.ans, width: 3.5 });
  sum.style.display = "none";
  const h = bd.handle([0, 1], { color: C.sum, r: 12 });
  const update = () => {
    if (placed) {
      neg.setAttribute("x1", bd.toSvg(B)[0]); neg.setAttribute("y1", bd.toSvg(B)[1]);
      neg.setAttribute("x2", bd.toSvg(M)[0]); neg.setAttribute("y2", bd.toSvg(M)[1]);
      h.move(B);
      sum.style.display = "";
      info(ui, "$-\\VV{MB} = \\VV{BM}$이에요. $\\VV{BM}+\\VV{MN}=\\VV{BN}$으로 이어져요!");
    } else {
      neg.setAttribute("x1", bd.toSvg(M)[0]); neg.setAttribute("y1", bd.toSvg(M)[1]);
      neg.setAttribute("x2", bd.toSvg([0, 4])[0]); neg.setAttribute("y2", bd.toSvg([0, 4])[1]);
      h.move([0, 3]);
      sum.style.display = "none";
      info(ui, "주황 점선($-\\VV{MB}$)을 끌어 B점에 놓아 이어 붙여 보세요.");
    }
  };
  bd.drag(h.el, {
    onMove: (w) => {
      placed = dist(w, B) < 1.0;
      update();
    },
  });
  update();
}

function sectorTool(ui) {
  const bd = new Board(ui.board, { xmin: -0.8, xmax: 6.8, ymin: -0.8, ymax: 6.8, width: 260 });
  const O = [0, 0], A = [6, 0], B = [0, 6];
  bd.seg(O, A, { stroke: C.axis, width: 2 });
  bd.seg(O, B, { stroke: C.axis, width: 2 });
  bd.arc(O, 6, 0, Math.PI / 2, { stroke: C.axis, width: 2, fill: C.roomHex });
  bd.point(O, { label: "O", dx: -10, dy: -10 });
  bd.point(A, { label: "A", dx: 10, dy: -10 });
  bd.point(B, { label: "B", dx: -10, dy: 10 });
  bd.arrow(O, A, { color: C.a, width: 2.5, label: "{a}" });
  bd.arrow(O, B, { color: C.b, width: 2.5, label: "{b}" });

  const arrowOC = bd.arrow(O, [0, 0], { color: C.ans, width: 3.5, label: "[OC]" });
  const dropX = bd.seg(O, O, { stroke: C.a, width: 2, dash: "4 3" });
  const dropY = bd.seg(O, O, { stroke: C.b, width: 2, dash: "4 3" });

  const setAngle = (deg) => {
    const rad = (deg * Math.PI) / 180;
    const Cpt = [6 * Math.cos(rad), 6 * Math.sin(rad)];
    const pX = [Cpt[0], 0], pY = [0, Cpt[1]];
    arrowOC.setAttribute("x2", bd.toSvg(Cpt)[0]); arrowOC.setAttribute("y2", bd.toSvg(Cpt)[1]);
    dropX.setAttribute("x1", bd.toSvg(Cpt)[0]); dropX.setAttribute("y1", bd.toSvg(Cpt)[1]);
    dropX.setAttribute("x2", bd.toSvg(pX)[0]); dropX.setAttribute("y2", bd.toSvg(pX)[1]);
    dropY.setAttribute("x1", bd.toSvg(Cpt)[0]); dropY.setAttribute("y1", bd.toSvg(Cpt)[1]);
    dropY.setAttribute("x2", bd.toSvg(pY)[0]); dropY.setAttribute("y2", bd.toSvg(pY)[1]);
    const m = (Math.cos(rad)).toFixed(2), n = (Math.sin(rad)).toFixed(2);
    info(ui, `$\\angle\\mathrm{AOC} = ${deg}^\\circ$일 때, $\\VV{OC} \\approx ${m}\\vv{a} + ${n}\\vv{b}$예요.`);
  };
  slider(ui.ctrl, { min: 10, max: 80, step: 5, value: 30, label: "각도" }, setAngle);
  setAngle(30);
}

function parallelTool(ui) {
  const bd = new Board(ui.board, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 260 });
  bd.arrow([0, 0], [1, -2], { color: C.sum, width: 3, dash: "4 3", label: "{p}+{q}" });
  bd.arrow([0, 0], [-1, 2], { color: C.sum, width: 1.5, dash: "4 3" });
  const qr = bd.arrow([0, 0], [0, 0], { color: C.ans, width: 3.5, label: "{q}-{r}" });

  const setM = (m) => {
    const v = [-1 - m, 4];
    qr.setAttribute("x2", bd.toSvg(v)[0]); qr.setAttribute("y2", bd.toSvg(v)[1]);
    if (m === 1) info(ui, "<b>m = 1</b>일 때 $\\vv{q}-\\vv{r}$가 보라색 점선과 정확히 평행해요!");
    else info(ui, `m = ${m}: $\\vv{q}-\\vv{r} = (${-1 - m})\\vv{a} + 4\\vv{b}$`);
  };
  slider(ui.ctrl, { min: -2, max: 3, step: 0.5, value: 0, label: "m 값" }, setM);
  setM(0);
}

function collinearTool(ui) {
  const bd = new Board(ui.board, { xmin: -1, xmax: 5, ymin: -1, ymax: 4, width: 260 });
  const O = [0, 0], A = [1, 2], B = [4, 1];
  bd.seg([-1, 2.67], [5, 0.67], { stroke: C.axis, width: 1.5, dash: "4 3" });
  bd.point(O, { label: "O", dx: -10, dy: -10 });
  bd.point(A, { label: "A", dx: -10, dy: 10, color: C.a });
  bd.point(B, { label: "B", dx: 10, dy: -10, color: C.b });
  const ptC = bd.point([0, 0], { label: "C", dx: 10, dy: 10, color: C.ans });

  const setM = (m) => {
    const Cpt = [2 * m * 1 + (m - 5) * 4, 2 * m * 2 + (m - 5) * 1];
    ptC.move(Cpt);
    if (m === 2) info(ui, "<b>m = 2</b>일 때 계수의 합 $2m + (m-5) = 1$이 되어 점 C가 직선 AB 위에 와요!");
    else info(ui, `m = ${m}: 계수의 합은 $3m-5 = ${3 * m - 5}$예요.`);
  };
  slider(ui.ctrl, { min: 0, max: 4, step: 0.5, value: 1, label: "m 값" }, setM);
  setM(1);
}

function cuboidTool(ui) {
  const bd = new Board(ui.board, { xmin: -1, xmax: 5, ymin: -1, ymax: 5, width: 260 });
  info(ui, "직육면체에서 서로 반대 방향인 가로·세로 성분은 합하면 0이 되고, 높이 방향 [GC]만 남아요.");
}

function circleTool(ui) {
  const bd = new Board(ui.board, { xmin: -1, xmax: 5, ymin: -1, ymax: 5, width: 260 });
  const O = [0, 0], Cpt = [2, 2];
  bd.circle(Cpt, 2, { fill: C.roomHex, stroke: C.axis, width: 2 });
  bd.point(O, { label: "O", dx: -10, dy: -10 });
  bd.point(Cpt, { label: "C(2,2)", dx: 10, dy: 10 });
  info(ui, "O에서 원에 그은 두 접선의 접점을 이으면 중심각이 90°(π/2)인 부채꼴 호가 돼요.");
}
