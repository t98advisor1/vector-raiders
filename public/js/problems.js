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
        hint: "두 팀원이 점 C에서 만날 때 두 벡터의 합의 크기가 최대가 돼요. A를 원점으로 두면 [p₁]=(4, t), [p₂]=(s, 4)라서 [p₁]+[p₂]=(4+s, 4+t)예요. s=t=4일 때 (8, 8)이 되어 최댓값은 8√2예요.",
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
        text: "평면 위의 서로 다른 네 점 O, A, B, C에 대하여 <보기>에서 옳은 것만을 있는 대로 고른 것은?\n\n[보기]\nㄱ. [OC] = 1/3[OA] + 2/3[OB]이면 점 C는 선분 AB를 2:1로 내분한다.\nㄴ. 세 점 O, A, B가 한 직선 위에 있지 않을 때, 세 점 A, B, C가 한 직선 위에 있을 필요충분조건은 [OC]=s[OA]+t[OB]에서 s+t=1이다.\nㄷ. [OC]=2[OA]-[OB]이면 점 A는 선분 BC의 중점이다.",
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
        hint: "[AG]=[AC]+[CG]이고 [CG]는 밑면과 수직이므로 [AC] · [CG] = 0이에요. 따라서 [AG] · [AC] = |[AC]|² = 2² + 2² = 8이에요.",
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
