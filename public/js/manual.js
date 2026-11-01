// 교사용 사용 설명서: 교과서 파일 + AI로 문항 세트(md)를 만드는 과정을 캐러셀로 가르치고,
// 상황(교과·그림 종류·답 형식·단계)을 고르면 AI에게 줄 프롬프트를 만들어 준다.
// 화면 글자만 다루고 서버와는 통신하지 않는다 (예시 파일 받기 버튼은 교사 화면의 같은 버튼을 누른다).

// ---------- AI에게 함께 주는 그림 문법 요약 ----------
const GRAMMAR = {
  base: `[그림 문법] '그림:' 다음에 평면(또는 공간)을 쓰고, 이름=값을 띄어서 쓴다. 값 안에는 띄어쓰기를 쓰지 않는다.
- 정의: a=2,1 (소문자: 벡터나 수)  A=0,0 (대문자: 점)  AB (정의하지 않으면 B−A)  P=A+t*AB (식, 위에서 아래 순서로 계산)
- 범위=xmin,xmax,ymin,ymax (평면) / 범위=r (공간)
- 끌기=A,b (학생이 끄는 점·벡터)   슬라이더=t,0,1,0.1;k,-2,2,1 (이름,최소,최대,간격)
- 보기=이름표:식;식 (그림 아래 실시간 값. 이름표 12자 이내, 띄어쓰기는 _ )
- 화살표=a,AB  선분=AB  다각형=ABCD  직선=P,u  원=C,r  자취=P  숨김=a
- 식: + − * / ^  2a(곱 생략)  |v|(크기)  a·b(내적)  √x  π  (x,y)  각(u,v)  mid(A,B)  cen(A,B,C)  cos·sin·tan(도), cosr·sinr·tanr(라디안), sqrt abs exp ln log`,
  graph: `- 그래프: 곡선=a*x^2-2*x;2^x (y=f(x), x가 변수, 슬라이더 값을 넣을 수 있음. 곡선 1, 2 … 순서)
- 미적분: 접선=1,a (곡선 1의 x=a에서 접선)  넓이=1,a,b (곡선 1과 x축 사이 a~b 색칠)
  보기= 에서 f1(x) 곡선 1의 값, d1(x) 미분계수, int1(a,b) 정적분 (f2, d2, int2 …)`,
  motion: `- 모션: 재생=t,4 (슬라이더 t가 4초 주기로 최소→최대→최소를 부드럽게 오감)  재생=회전,10 (공간 그림이 10초에 한 바퀴)
  학생이 그림을 만지면 멈춘다. 재생=없음이면 움직이지 않는다`,
  space: `- 공간: 그림: 공간 …  평면=n,d (n·x + d = 0)  구=C,r  직육면체=가로,세로,높이 (꼭짓점 A~H 자동), 학생이 끌어서 돌려 본다`,
  image: `- 사진·지도·작품처럼 조작할 수 없는 그림: 그림: /img/…  (교사 화면 '그림 파일 올리기'로 올린 뒤 받은 주소)`,
  code: `[그림은 코드로 — 이미지보다 가볍다]
- 그래프·도형·움직임은 이미지 파일을 만들지 말고 위 문법의 "그림:" 한 줄(코드)로 쓴다. 한 줄은 100바이트 안팎이라 사진(수백 KB)보다 훨씬 빨리 열리고 학생이 직접 조작할 수 있다
- 파이썬·자바스크립트·지오지브라·데스모스 코드는 쓰지 않는다(올릴 수 없다). 그런 코드가 떠오르면 같은 그림을 "그림:" 문법으로 옮긴다
- 사진·지도·작품처럼 코드로 그릴 수 없는 것만 그림 파일로 한다. 이때 문항에 "그림: /img/(올릴 그림)"이라 쓰고, 맨 끝에 [필요한 그림 파일] 목록(문항 번호, 무엇을 담은 그림인지)을 따로 적는다
- 그림 파일은 webp 형식, 가로 1000px 이하, 200KB 이하로 가장 많이 압축해 쓰도록 안내한다`,
  examples: `예) 그림: 평면 a=3,-4 끌기=a 보기=a;|a|
예) 그림: 평면 A=1,3 B=7,0 P=(1-t)*A+t*B 슬라이더=t,0,1,0.1 화살표=A,B,P 자취=P 보기=|AP| 재생=t,4
예) 그림: 평면 범위=-1,4,-1,9 곡선=x^2 슬라이더=a,0,3,0.5;b,0,3,0.5 접선=1,a 넓이=1,0,b 보기=기울기:d1(a);넓이:int1(0,b)
예) 그림: 공간 직육면체=3,4,12 화살표=AC,AG 보기=ㄱ:|AC|;ㄴ:|AG| 재생=회전,12`,
};

// ---------- 프롬프트 만들기 ----------
export function buildPrompt(o) {
  const subj = o.subject?.trim() || "수학";
  const unit = o.unit?.trim() || "(단원 이름)";
  const pages = o.pages?.trim() ? ` (${o.pages.trim()}쪽)` : "";
  const isMath = /수학|기하|미적분|대수|확률|통계/.test(subj);
  const file = { pdf: "첨부한 교과서 PDF", hwpx: "첨부한 교과서 PDF(한글 파일을 PDF로 저장한 것)", photo: "첨부한 교과서 쪽 사진" }[o.file] ?? "첨부한 교과서 PDF";
  const figs = o.figs ?? [];
  const kinds = o.kinds ?? [];
  const lines = [];
  const intro = `첨부한 예시 파일(${isMath ? "geo-3-1.md" : "다른 교과 예시 md"})은 방탈출 학습 게임의 문항 세트 파일입니다.
이 게임의 목적은 개념 학습과, 학생이 그림을 직접 끌거나 조절기를 움직이며 개념을 스스로 발견하게 하는 것입니다.
${file}의 [${subj}] ${unit}${pages} 내용으로, 예시 파일과 똑같은 형식을 따라 주세요.`;
  lines.push(intro);

  const structure = `[게임 구조]
- 상자 9개(# 상자 1 ~ # 상자 9). 상자 1~3은 방 1, 상자 4~5는 방 2, 상자 6~7은 방 3, 상자 8~9는 방 4
- 상자마다 ## 하(교과서 예제 수준) / ## 중(교과서 문제 수준) / ## 상(심화) 3문항 = 27문항
- 상자 6~9는 "협업: 예". 그 상자의 상 문항은 조건 ㉠, ㉡을 따로 쓰고 두 조건을 모두 알아야 풀리게 한다.
  문제 첫 줄: "🤝 두 사람이 조건을 하나씩 나눠 가졌어요.\\n채팅으로 조건을 알려 주고 함께 푸세요.\\n"
- 핵심 카드 9장 안팎: # 핵심 카드 · 이름 / - 비석: 상자 번호 / 그림: (선택) / 요약: 한 문장 / - 설명 2~4줄
- 상자 머리의 "- 개념:" 이름과 핵심 카드 제목을 똑같이 맞춘다
- 숫자와 예시는 교과서와 다르게 새로 정한다(유형과 개념 순서만 따른다)`;

  const people = o.people ? `- 인물 카드 2~5장: 이 단원과 관련된 인물(학자·작가·발명가 등)
  # 인물 카드 · 이름 (원어 이름) / - 시대: / - 업적: / - 분야: 이모지 한 개 + 두세 낱말 / - 명언: (확실한 것만, 없으면 빼기) / 이야기: 학생 눈높이 2~3문장
  사실이 확실한 내용만 쓴다` : "";

  const notation = isMath && o.math !== "off"
    ? `[표기] 벡터 AB는 [AB], 벡터 a는 {a}, 영벡터는 $\\vv{0}$. √, π, θ, °, ², ·는 그대로 써도 수식으로 바뀐다. 복잡한 식은 $...$ 안에 TeX로.`
    : `[표기] 머리말에 "수식: ${o.math === "on" ? "켬" : "끔"}"을 넣는다. ${o.math === "on" ? "글 속 영문자·기호가 수식으로 바뀐다." : "글 속 영어·기호는 그대로 보이고, 수식이 필요한 곳만 $...$ 안에 TeX로 쓴다(예: $v = \\frac{s}{t}$)."}`;

  const answerKinds = [
    kinds.includes("num") && "숫자: 정답은 2√5, 1/2, -3, 29.4처럼 하나의 값",
    kinds.includes("choice") && "오지선다: 보기 5개를 | 로, 정답은 번호. ㄱㄴㄷ 합답형은 문제 끝에 \"\\n\\n[보기]\\nㄱ. …\\nㄴ. …\\nㄷ. …\", 보기: ① ㄱ | ② ㄱ, ㄴ | ③ ㄱ, ㄷ | ④ ㄴ, ㄷ | ⑤ ㄱ, ㄴ, ㄷ",
    kinds.includes("set") && "고르기: 보기를 쉼표로, 정답도 쉼표로 (예: 보기: m/s, km/h, N / 정답: m/s, km/h)",
    kinds.includes("text") && "단답형: 글자로 답하는 문제. 정답이 여러 표현이면 | 로 (예: 정답: 광합성 | 광합성 작용). 띄어쓰기·대소문자는 무시된다",
    kinds.includes("vec") && "벡터식: -a+2b, 1/3a+2/3b처럼 문자 벡터의 일차결합",
  ].filter(Boolean);

  const figRules = [];
  if (figs.includes("none") && figs.length === 1) {
    figRules.push(`[그림] 모든 문항에 "그림: 없음"을 쓰고, "조작:" 줄에는 생각할 거리를 한 문장으로 쓴다.`);
  } else {
    figRules.push(`[그림과 조작 — 이 게임의 핵심]
- 문항마다 "그림:" 줄과 "조작:" 줄을 쓴다. 그림의 수치는 문제의 수치와 똑같이 맞춘다
- 학생이 그림을 움직이다 보면 답의 실마리를 스스로 찾게 설계한다 (보기= 에는 답 대신 중간값을 띄운다)
- 합답형은 보기= 에 ㄱ, ㄴ, ㄷ 각각의 양쪽 값을 띄워 조작하며 참·거짓을 확인하게 한다
- 조작: 은 무엇을 움직여 무엇을 보면 되는지 한 문장. 답은 알려 주지 않는다
- 그림이 도움이 되지 않는 문항만 "그림: 없음"`);
    if (figs.includes("motion")) figRules.push(`- 변하는 모습으로 보여야 하는 개념(움직이는 점, 바뀌는 그래프, 공간 도형)은 재생= 으로 처음 열 때 저절로 움직이게 한다`);
    if (figs.includes("image")) figRules.push(`- 다음 그림 파일을 알맞은 문항·카드에 쓴다: ${o.images?.trim() || "(교사 화면에서 올린 /img/… 주소와 무슨 그림인지 적기)"}`);
    figRules.push(GRAMMAR.base);
    if (figs.includes("graph")) figRules.push(GRAMMAR.graph);
    if (figs.includes("motion")) figRules.push(GRAMMAR.motion);
    if (figs.includes("space")) figRules.push(GRAMMAR.space);
    if (figs.includes("image")) figRules.push(GRAMMAR.image);
    figRules.push(GRAMMAR.code);
    figRules.push(GRAMMAR.examples);
  }

  const lineRule = `[문제 문장] 한 줄로 길게 쓰지 말고 \\n으로 줄을 나눈다 (조건 → 정의 → 묻는 것).
[풀이] 두 번 틀리면 보이는 힌트. 먼저 "그림에서 무엇을 보면 되는지" 한 줄, 그다음 2~3단계 풀이, 마지막에 답.`;

  const stage = o.stage ?? "all";
  if (stage === "1") {
    lines.push(structure, people,
      `md 파일을 만들기 전에 먼저 설계표를 표로 주세요.
[설계표의 열] 상자 번호 | 방 | 상자 이름(개념) | 연결 핵심 카드 | 조작 아이디어(무엇을 움직이면 → 무엇이 보여 → 어떤 개념을 발견하는가) | 하·중·상 문항 아이디어 | 협업 상자의 조건 ㉠·㉡ 나누기${o.people ? " | (표 아래) 인물 카드 후보와 이유" : ""}
조작 아이디어는 "보는 그림"이 아니라 "움직이며 발견하는 그림"이어야 합니다. 아직 md 파일은 만들지 마세요.`);
  } else if (stage === "2") {
    lines.push(`확정한 설계표대로 핵심 카드${o.people ? "와 인물 카드" : ""} 부분만 예시 파일 형식으로 만들어 주세요.`, notation, people,
      `[핵심 카드] # 핵심 카드 · 이름 / - 비석: 상자 번호 / 그림: (개념을 움직이며 확인하는 그림) / 요약: 한 문장 정의나 공식 / - 설명 2~4줄 (그림에서 무엇을 움직여 보면 되는지 한 줄 포함)`,
      ...figRules);
  } else {
    if (stage === "3") lines.push(`확정한 설계표와 핵심 카드에 맞춰 27문항을 만들고, 머리말·상자·핵심 카드${o.people ? "·인물 카드" : ""}를 합친 md 파일 하나로 주세요.`);
    lines.push(`[맨 위 머리말] 세트: 영문 소문자·숫자·하이픈 이름(예: ${isMath ? "math1-2-3" : "sci-2-1"}) / 제목: / 교과: ${subj} / 단원: ${unit} / ${isMath && o.math !== "off" ? "" : `수식: ${o.math === "on" ? "켬" : "끔"} / `}출처:`);
    lines.push(structure, people, `[상자 머리] # 상자 N · 이름 / - 방: / - 협업: 예·아니오 / - 그림: 없음 / - 개념: (카드 제목과 같게)
[문항 줄 순서] ## 하(중, 상) → 그림: → 조작: → 문제: → (조건 ㉠: → 조건 ㉡:) → 답 형식: → (보기:) → 정답: → 풀이:`,
      notation, `[답 형식]\n- ${answerKinds.join("\n- ") || "숫자"}`, lineRule, ...figRules,
      `[마지막 확인] 27문항의 정답을 다시 풀어 검산하고, 오지선다 보기가 5개인지 확인한 뒤, 설명 없이 md 파일 하나로 주세요.`);
  }
  return lines.filter(Boolean).join("\n\n");
}

// ---------- 캐러셀 ----------
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const copyBtn = (id, label = "📋 복사") => `<button class="btn copy-btn" type="button" data-copy="${id}">${label}</button>`;
// 화면 그림 (6인 모의 진행 캡처). 누르면 크게 본다.
const shot = (name, cap) => `<figure class="mn-shot"><img src="/img/manual/${name}.webp" alt="${esc(cap)}" loading="lazy" data-zoom><figcaption>${cap}</figcaption></figure>`;
const shots = (...list) => `<div class="mn-shots n${list.length}">${list.map(([n, c]) => shot(n, c)).join("")}</div>`;
const keys = (title, items) => `<div class="mn-keys"><b>✅ ${title}</b><ul>${items.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;
const flow = (...steps) => `<ol class="mn-steps">${steps.map((t) => `<li>${t}</li>`).join("")}</ol>`;
const tip = (t) => `<p class="mn-tip">${t}</p>`;

// 1부: 수업 운영 (6인 모의 진행: A팀 3명, B팀 3명, 교사 1명), 2부: AI로 문항 세트 만들기
const SLIDES = [
  { part: "class", title: "수업 운영 한눈에 보기", html: `
    <p class="mn-lead">그림은 6명(A팀 3명, B팀 3명) 모의 수업 화면이고, 다음 장에는 선생님이 진행한 4인 실제 모의 수업 기록을 정리했습니다. 그림을 누르면 크게 볼 수 있어요.</p>
    ${shots(["s-start", "학생 화면: 탐험 중 (팀 랭킹·지도·채팅)"], ["t-dash-top", "교사 화면: 채널 관제 (유물·팀 점수)"])}
    ${flow("🔑 교사 로그인·단원 고르기", "🧑‍🎓 학생 입장 (채널 → 팀 → 이름)", "▶ 탐험 시작", "📦 상자 풀기 (개념 → 조작 → 제출)", "🤝 협업·💬 채팅·🚪 팀 문", "🏁 탐험 종료", "🖨️ 형성평가·기록 출력")}
    ${keys("핵심", ["학생은 <b>방 코드 없이</b> 채널 번호만 고르면 들어옵니다.", "교사 화면은 수업 내내 <b>켜 두세요</b>. 채팅 기록이 교사 화면에 모입니다.", "모든 기록(점수·풀이 시간·오답·협업)은 교사 화면과 CSV에 남습니다."])}` },
  { part: "class", title: "실제 4인 모의 진행에서 확인한 것", html: `
    <p class="mn-lead">2026-11-01, 1채널(기하 Ⅲ-1)에서 서로 다른 브라우저 4개로 A팀 2명·B팀 2명이 실제로 끝까지 진행한 기록입니다.</p>
    <table class="mn-table"><thead><tr><th>학생(모의 이름)</th><th>열쇠</th><th>벡터 점프</th><th>점수</th><th>결과</th></tr></thead><tbody>
      <tr><td>모의_A1</td><td>9/9</td><td>5/5</td><td>2128</td><td>🏁 모든 방 탈출 · 6번 상 협업 제출</td></tr>
      <tr><td>모의_A2</td><td>9/9</td><td>5/5</td><td>1990</td><td>🏁 모든 방 탈출 · 6번은 짝(A1)이 맞혀 함께 받음</td></tr>
      <tr><td>모의_B1</td><td>9/9</td><td>5/5</td><td>2090</td><td>🏁 모든 방 탈출 · 마지막에 우리 반 유물 9/9</td></tr>
      <tr><td>모의_B2</td><td>9/9</td><td>5/5</td><td>2088</td><td>🏁 모든 방 탈출</td></tr>
    </tbody></table>
    <div class="mn-keys"><b>💬 A팀이 실제로 나눈 협업 대화 (6번 상: 조건 ㉠ x+y=3a−b / ㉡ x−y=a+5b)</b><ul>
      <li>A2: "내 조건 ㉡은 x−y=a+5b야! 네 조건은 뭐야? 두 식 더하면 y 없앨 수 있을 듯"</li>
      <li>A1: "내 조건 ㉠은 x+y=3a−b야! 더하면 2x=4a+4b네. 그럼 x=2a+2b 맞지?"</li>
      <li>A2: "맞아! 다시 빼 보면 y=a−3b라 두 조건 다 맞네. 제출 가자!" → A1 제출, A2도 열쇠 7/9로 함께 증가</li>
    </ul></div>
    ${keys("운영 팁 (모의 진행에서 겪은 일)", [
      "<b>학생마다 다른 기기</b>(또는 다른 크롬 프로필)로 들어오게 하세요. 같은 브라우저의 여러 탭은 같은 학생으로 처리되어 서로 접속을 끊습니다.",
      "뒤에 숨어 있는 브라우저 탭은 느려집니다. 게임 창을 앞에 두고 하게 하세요.",
      "<b>채팅을 친 뒤</b> Esc(또는 빈 칸에서 Enter)를 누르면 바로 이동·E 조작으로 돌아갑니다.",
      "용암 다리(벡터 점프)는 비석이 아니라 <b>용암 가장자리 밝은 통로 쪽</b>에서 E를 누릅니다.",
      "채팅은 <b>채널 전체</b>에 보입니다(팀 전용 아님). 협업 조건이 다른 팀에도 보일 수 있다고 미리 알려 주세요.",
      "지난 접속 기록이 남으면 팀 인원·랭킹 행 수가 실제 접속자와 다를 수 있습니다. 반이 바뀌면 <b>새 수업 시작</b>으로 정리하세요.",
    ])}
    ${tip("🔧 이 모의 진행에서 발견해 고친 것: ① 협업 짝이 끊겨 상 난이도 제출이 막히던 문제(짝 정보를 서버에 저장) ② 채팅 보내기를 누르면 문제 창이 닫히던 문제(채팅을 문제 창 위로) ③ 용암 앞 E가 비석을 열던 문제 ④ 교사 표에서 협업으로 받은 열쇠가 '–'로 보이던 문제(이제 🤝) ⑤ '문제는 같고 배점만 달라요' 안내 → '난이도마다 문제가 달라요'")}` },
  { part: "class", title: "1. 수업 전 준비 (교사)", html: `
    ${shots(["t-login", "교사 비밀번호로 로그인"], ["t-dash-top", "채널 관제 화면: 단원·시작·CSV·새 수업"])}
    ${keys("순서", ["교사 비밀번호(중간관리자는 채널 비밀번호)로 들어갑니다. 내 채널만 열립니다.", "<b>이 채널 단원</b>에서 오늘 단원을 고릅니다.", "지난 반 기록이 있으면 <b>CSV 내려받기</b> 후 <b>새 수업 시작</b>.", "<b>학생 초대 링크 복사</b>로 주소(…/?ch=채널)를 학생에게 보냅니다."])}` },
  { part: "class", title: "2. 학생 입장: 채널 → 팀 → 이름", html: `
    ${shots(["s-menu", "① '수업 참가' 고르기"], ["s-channel", "② 채널 고르기"], ["s-team", "③ 팀 고르기 (최대 8명)"], ["s-name", "④ 번호와 이름 쓰기"])}
    ${keys("안내할 말", ["\"수업 참가 → 선생님이 말한 채널 → 우리 팀 → <b>번호+이름</b>(예: 1번 이서연)\"", "새로고침하거나 연결이 끊겨도 같은 기기에서는 기록이 이어집니다.", "연습 모드는 혼자 하는 복습용이라 교사 화면에 남지 않습니다."])}` },
  { part: "class", title: "3. 탐험 시작", html: `
    ${shots(["s-start", "탐험이 시작되면 상자와 문이 열립니다"])}
    ${keys("두 가지 방법", ["교사 화면의 <b>▶ 탐험 시작</b> 버튼", "학생 화면 위쪽 띠의 <b>🔑 선생님: 탐험 시작</b> → 시작 비밀번호 (교실 앞 화면에서)", "시작 전에는 학생이 돌아다니기만 할 수 있습니다."])}` },
  { part: "class", title: "4. 상자 풀기: 개념 → 조작 → 제출", html: `
    ${shots(["s-concept", "① 상자를 열면 먼저 핵심 카드"], ["s-diff", "② 난이도 고르기 (하 70 · 중 100 · 상 150)"], ["s-problem", "③ 그림을 움직이며 풀기"])}
    ${flow("상자 앞에서 E (또는 화면 버튼)", "핵심 카드 읽기 (+50점)", "난이도 고르기", "그림 끌기·조절기·돌리기", "답 제출", "2번 틀리면 힌트")}
    ${keys("지도 포인트", ["합답형은 <b>[보기] 상자</b>에 ㄱ·ㄴ·ㄷ이 한 줄씩, 그림 아래에 양쪽 값이 나옵니다.", "힌트를 보고 맞히면 '한 번에 정답' 보너스는 받지 못합니다.", "키보드: WASD·방향키 이동 · E 열기 · M/Tab 지도 · G 사격 · H 점프"])}` },
  { part: "class", title: "5. 팀 문: 절반 이상이 열면 함께", html: `
    ${shots(["s-teamdoor", "A팀 2명이 1번 방 문을 열자 이서연에게도 문이 열림"])}
    ${keys("규칙", ["방의 열쇠(상자)를 모두 모으면 그 방의 문이 열립니다.", "같은 팀(2명 이상)의 <b>절반 이상</b>이 열면 <b>그 팀의 나머지</b>에게도 열립니다. 다른 팀은 각자 열어야 합니다.", "예: 3명 팀 → 2명, 4명 팀 → 2명, 5명 팀 → 3명", "잠긴 문 앞에서 '팀원 2명이 열면 함께 열려요 (지금 1/3명)'처럼 진행 상황이 보입니다."])}` },
  { part: "class", title: "6. 협업 문항 (3·4번 방의 상 난이도)", html: `
    ${shots(["s-coop-wait", "① 짝 기다리기"], ["s-coop", "② 짝 연결: 나는 조건 ㉠만 보임"], ["s-coop-chat", "③ 문제 창을 연 채로 채팅해 조건 교환"], ["s-coop-solved", "④ 한 명이 맞히면 둘 다 해결"])}
    ${flow("같은 팀 2명이 같은 상자 4칸 안에", "둘 다 '상' 문제 열기", "한 명은 조건 ㉠, 한 명은 조건 ㉡", "채팅으로 조건 알려 주기", "한 명이 맞히면 둘 다 열쇠")}
    ${keys("알아 둘 것", ["1분을 기다려도 짝이 없으면 <b>혼자 풀기</b>(두 조건 모두, 중 배점 100점)를 고를 수 있습니다.", "짝이 된 뒤 창을 닫았다 다시 열어도 <b>같은 짝·같은 조건</b>이 다시 나옵니다. 둘 중 한 명만 제출하면 됩니다.", "교사 화면 학생 기록에 <b>🤝 협업한 짝</b>이 남습니다.", "연습 모드에서는 처음부터 두 조건이 모두 보입니다."])}` },
  { part: "class", title: "7. 채팅과 채팅 기록", html: `
    ${shots(["s-chat", "학생 채팅: 팀 색 표시, 오른쪽 아래"])}
    ${keys("채팅 기록 받기", ["교사 화면 위쪽 <b>💬 학생 채팅 기록 다운로드 (N)</b> → CSV 파일", "<b>교사 화면이 켜져 있는 동안</b> 모든 채널의 채팅이 모입니다. 수업 중에는 교사 화면을 닫지 마세요.", "한 줄 100자, 줄바꿈·특수 문자는 지워져 전달됩니다."])}
    <table class="mn-table"><thead><tr><th>시각</th><th>채널</th><th>팀</th><th>이름</th><th>내용</th></tr></thead><tbody>
      <tr><td>10:01:54</td><td>1채널</td><td>A팀</td><td>2번 김민준</td><td>안녕! 우리 A팀 1번 상자부터 가자</td></tr>
      <tr><td>10:02:31</td><td>1채널</td><td>A팀</td><td>1번 이서연</td><td>그림 돌려 보니까 ㄱ이 맞아</td></tr>
      <tr><td>10:02:33</td><td>1채널</td><td>B팀</td><td>6번 윤서준</td><td>B팀 문 열렸다!</td></tr>
    </tbody></table>` },
  { part: "class", title: "8. 교사용 기록 보기", html: `
    ${shots(["t-roster", "학생별: 이름을 누르면 문제마다 결과·난이도·풀이 시간·협업"], ["t-problems", "문제별: 도전·정답 인원, 첫 시도 정답률, 자주 나온 오답"])}
    ${keys("어디서 무엇을", ["<b>학생별 집계</b>: 순위·점수·맞힌 문제·오답 수·접속·들어온/탈출 시각·위치·벡터 점프·활동", "기호: ★ 첫 시도 정답 · ✓ 정답 · 🤝 협업 짝이 맞혀 함께 해결 · ✗n n번 오답 · 💡 힌트 봄 · – 미응시", "<b>문제별 현황</b>: 정답률 50% 미만은 빨간색 → 다음 시간 다시 짚을 문제", "<b>CSV 내려받기</b>: 학생 × 문제 결과·풀이 시간(초)·오답을 엑셀로"])}` },
  { part: "class", title: "9. 탐험 종료와 학생 출력", html: `
    ${shots(["s-escaped", "상자 9개를 모두 풀면 바로 결과 창"], ["s-summary", "결과 창: 형성평가·풀이 기록·오답 정리"], ["s-fa-sheet", "형성평가 문제지 미리보기 (2단, 그림 포함)"])}
    ${keys("학생이 받는 것", ["<b>📝 형성평가 문제지 / ✅ 답지</b>: 탐험에서 푼 난이도의 문제 9개", "<b>🗂️ 나의 풀이 기록</b>: 푼 문제 전부(그림·내 답·정답·풀이)", "<b>📄 나의 오답 정리</b>: 틀리거나 여러 번 시도한 문제만", "모든 방을 탈출하면 팀원이 아직 풀고 있어도 바로 출력할 수 있습니다(그때는 자기 난이도의 정답만).", "교사가 <b>■ 탐험 종료</b>를 누르면 모두에게 결과 창이 열립니다."])}` },
  { part: "class", title: "10. 교사용 출력 (PDF)", html: `
    ${shots(["t-printmenu", "🖨️ 출력 창: 난이도를 고르고 미리보기"], ["s-mine", "출력 미리보기 창의 '인쇄 / PDF로 저장'"])}
    ${keys("출력물", ["<b>📝 형성평가 문제지 / ✅ 교사용 답안</b>: 하·중·상 전체 또는 한 난이도, 2단, 그림 포함", "<b>📚 핵심 카드</b>: 비석 카드 모음", "<b>📄 교사용 해설집</b>: 상자마다 하·중·상 문제·정답·풀이·협업 조건·자주 나온 오답", "새 창의 <b>🖨️ 인쇄 / PDF로 저장</b> → 대상 'PDF로 저장'. 아이패드는 공유 → 프린트에서 두 손가락으로 벌리면 PDF"])}` },
  { part: "class", title: "11. 다음 반 수업과 변경 기록", html: `
    ${shots(["t-upload", "문항 세트·그림 올리기와 📜 문항 변경 기록"])}
    ${flow("CSV 내려받기", "💬 채팅 기록 받기", "새 수업 시작 (기록 지우기)", "필요하면 단원 바꾸기", "학생 입장")}
    ${keys("기억할 것", ["새 수업 시작·단원 바꾸기는 그 채널의 기록을 지웁니다. 먼저 내려받으세요.", "세트·그림을 올리거나 단원을 바꾸면 <b>📜 문항 변경 기록</b>에 자동으로 남고 CSV로 받을 수 있습니다.", "24시간 동안 아무도 들어오지 않으면 기록이 자동으로 지워집니다."])}` },

  { part: "make", title: "AI로 문항 세트 만들기: 한눈에", html: `
    <p class="mn-lead">교과서 파일을 AI에게 주고 <b>md 파일 한 개</b>를 받아 올리면, 그 채널의 문항·카드·그림·인물 카드·출력물이 모두 바뀝니다. 머지·배포는 필요 없습니다.</p>
    ${flow("📄 교과서 PDF", "📥 예시 md 받기", "🤖 AI: 설계표 → 카드 → 문항", "🔎 검사만 하기", "📤 저장·적용", "🎮 수업·🖨️ 출력")}
    <table class="mn-table"><thead><tr><th>md 파일</th><th>게임 화면</th></tr></thead><tbody>
      <tr><td><code># 상자 1~9</code>, <code>- 방: 1~4</code></td><td>방마다 놓인 상자 (방 1: 1~3, 방 2: 4~5, 방 3: 6~7, 방 4: 8~9)</td></tr>
      <tr><td><code>## 하 / 중 / 상</code></td><td>상자를 열면 고르는 난이도 (70 / 100 / 150점)</td></tr>
      <tr><td><code>- 협업: 예</code> + <code>조건 ㉠ ㉡</code></td><td>상 난이도 2인 협업</td></tr>
      <tr><td><code>그림:</code> + <code>조작:</code></td><td>문제 창의 움직이는 그림과 안내</td></tr>
      <tr><td><code># 핵심 카드</code> / <code># 인물 카드</code></td><td>비석 개념 카드 / 수정을 깨면 나오는 인물 이야기</td></tr>
      <tr><td><code>풀이:</code></td><td>두 번 틀리면 힌트, 해설집·풀이 기록</td></tr>
    </tbody></table>` },
  { part: "make", title: "교과서 파일은 PDF로", html: `
    <table class="mn-table"><thead><tr><th>가진 파일</th><th>이렇게 주세요</th><th>이유</th></tr></thead><tbody>
      <tr><td>📕 출판사 교과서 PDF</td><td><b>그대로 (권장)</b>, 필요한 쪽만</td><td>글·그림·표·수식을 함께 읽습니다</td></tr>
      <tr><td>📘 한글 파일 (hwp·hwpx)</td><td>한글에서 <b>파일 → PDF로 저장</b></td><td>AI 대부분이 hwpx를 바로 못 읽거나 수식·그림이 빠집니다</td></tr>
      <tr><td>📷 사진·스캔</td><td>반듯하고 밝게</td><td>수식·숫자 오인식 → 정답 검산 필수</td></tr>
    </tbody></table>
    ${keys("요령", ["한 번에 <b>20~30쪽 이하</b>, 해당 소단원의 개념·예제·문제 쪽만", "숫자는 교과서와 다르게 새로 정하게 합니다(저작권)", "그래프·도형은 그림 파일 대신 <b>코드(그림: 한 줄)</b>로 — 가볍고 학생이 조작합니다", "사진·지도가 필요하면 <b>webp·200KB 이하</b>로 줄여 <b>🖼️ 그림 파일 올리기</b> → 받은 <code>/img/…</code> 주소를 프롬프트에"])}
    <div class="mn-row">
      <button class="btn" type="button" data-click="#set-example">📄 수학 예시 받기 (벡터 3-1)</button>
      <button class="btn" type="button" data-click="#set-example-other">📄 다른 교과 예시 받기 (과학)</button>
    </div>` },
  {
    part: "make", title: "프롬프트 만들기", gen: true, html: `
      <p class="mn-lead">상황을 고르면 AI에게 줄 프롬프트가 만들어집니다. <b>1단계 → 2단계 → 3단계</b> 순서로 요청하고, 단계마다 확인한 뒤 넘어가세요.</p>
      <div class="mn-form">
        <label>교과 <input id="mg-subject" value="수학" placeholder="예: 미적분, 과학, 사회"></label>
        <label>단원 <input id="mg-unit" placeholder="예: Ⅱ-1. 미분계수와 도함수"></label>
        <label>쪽 <input id="mg-pages" placeholder="예: 52~71"></label>
        <label>교과서 파일 <select id="mg-file"><option value="pdf">PDF</option><option value="hwpx">한글 → PDF로 저장</option><option value="photo">사진·스캔</option></select></label>
        <label>단계 <select id="mg-stage"><option value="1">1단계: 설계표</option><option value="2">2단계: 핵심 카드·인물 카드</option><option value="3">3단계: 문항 27개 + 합치기</option><option value="all">한 번에 전체 (짧은 단원)</option></select></label>
        <label>글 속 수식 <select id="mg-math"><option value="auto">교과에 맞게 (수학이면 켬)</option><option value="on">켬</option><option value="off">끔 ($...$만 수식)</option></select></label>
        <fieldset><legend>그림 종류</legend>
          <label><input type="checkbox" name="mg-fig" value="drag" checked> 끌기·조절기 (벡터·도형·점)</label>
          <label><input type="checkbox" name="mg-fig" value="graph"> 그래프 (곡선·접선·넓이, 미적분)</label>
          <label><input type="checkbox" name="mg-fig" value="motion" checked> 모션 (재생=, 저절로 움직임)</label>
          <label><input type="checkbox" name="mg-fig" value="space"> 공간 (3D, 돌려 보기)</label>
          <label><input type="checkbox" name="mg-fig" value="image"> 그림 파일 (사진·지도·작품)</label>
          <label><input type="checkbox" name="mg-fig" value="none"> 그림 없음</label>
        </fieldset>
        <fieldset><legend>답 형식</legend>
          <label><input type="checkbox" name="mg-kind" value="num" checked> 숫자</label>
          <label><input type="checkbox" name="mg-kind" value="choice" checked> 오지선다·합답형</label>
          <label><input type="checkbox" name="mg-kind" value="set"> 고르기</label>
          <label><input type="checkbox" name="mg-kind" value="text"> 단답형(글자)</label>
          <label><input type="checkbox" name="mg-kind" value="vec"> 벡터식</label>
        </fieldset>
        <label class="mn-wide" id="mg-images-wrap" hidden>올린 그림 주소와 설명 <input id="mg-images" placeholder="예: /img/a1b2c3d4e5f6.png 세포 사진"></label>
        <label class="mn-check"><input type="checkbox" id="mg-people" checked> 인물 카드 넣기</label>
      </div>
      <textarea id="mg-out" class="mn-out" readonly rows="10"></textarea>
      <div class="mn-row">${copyBtn("mg-out", "📋 프롬프트 복사")}<span class="muted">→ AI 채팅에 교과서 PDF + 예시 md를 첨부하고 붙여 넣기</span></div>`,
  },
  { part: "make", title: "단계별로 확인할 것", html: `
    ${flow("1단계 설계표: 상자 9개의 개념·조작 아이디어", "2단계 핵심 카드·인물 카드", "3단계 문항 27개 + 한 파일로 합치기")}
    <table class="mn-table"><thead><tr><th>단계</th><th>확인할 것</th><th>좋은 예</th></tr></thead><tbody>
      <tr><td>설계표</td><td>조작 아이디어가 '움직여서 발견'인가</td><td>"a를 움직이면 접선 기울기가 바뀌고, 그 값이 미분계수다"</td></tr>
      <tr><td>카드</td><td>카드 제목 = 상자의 <code>- 개념:</code></td><td>카드에도 그림: 을 넣으면 비석에서 바로 조작</td></tr>
      <tr><td>협업</td><td>조건 ㉠·㉡ 하나만으로는 안 풀리는가</td><td>㉠ 질량 4 kg / ㉡ 속도 2→8 m/s (2초)</td></tr>
      <tr><td>문항</td><td>그림 수치 = 문제 수치, 보기= 에 답 대신 중간값</td><td>합답형은 ㄱ·ㄴ·ㄷ 양쪽 값</td></tr>
    </tbody></table>
    ${tip("💡 고칠 점은 설계표 단계에서 말하세요. 예: \"상자 4의 조작 아이디어를 넓이 대신 접선으로 바꿔 주세요.\"")}` },
  { part: "make", title: "그림 고르기 (시뮬레이션)", html: `
    <table class="mn-table"><thead><tr><th>이런 수업이면</th><th>그림 줄 예</th></tr></thead><tbody>
      <tr><td>벡터·도형 (끌어 보기)</td><td><code>평면 A=1,3 B=5,1 끌기=A,B 화살표=AB 보기=|AB|</code></td></tr>
      <tr><td>함수 그래프 (계수 바꾸기)</td><td><code>평면 범위=-3,3,-2,6 곡선=a*x^2 슬라이더=a,-2,2,0.5</code></td></tr>
      <tr><td>미분 (접선)</td><td><code>곡선=x^3-3*x 슬라이더=a,-2,2,0.25 접선=1,a 보기=기울기:d1(a)</code></td></tr>
      <tr><td>적분 (넓이)</td><td><code>곡선=x^2 슬라이더=b,0,3,0.5 넓이=1,0,b 보기=넓이:int1(0,b)</code></td></tr>
      <tr><td>시뮬레이션 (저절로)</td><td><code>P=(1-t)*A+t*B 슬라이더=t,0,1,0.1 자취=P 재생=t,4</code></td></tr>
      <tr><td>공간 도형 (돌려 보기)</td><td><code>공간 직육면체=3,4,2 화살표=AG 재생=회전,10</code></td></tr>
      <tr><td>사진·지도·작품</td><td><code>그림: /img/…</code> (그림 파일 올리기)</td></tr>
    </tbody></table>
    ${tip("🔒 md 파일에 프로그램 코드를 직접 넣는 방식은 받지 않습니다. 올린 코드는 모든 학생 기기에서 실행되기 때문입니다. 위 그림 문법으로 대부분의 시뮬레이션을 만들 수 있고, 업로드 검사가 오류를 미리 찾아 줍니다.")}` },
  { part: "make", title: "코드 그림 올리는 법 (그래프는 코드로)", html: `
    <p class="mn-lead">코드로 그린 그림은 <b>따로 올리지 않습니다.</b> md 파일 안의 <code>그림:</code> 한 줄이 곧 그림 코드이고, md 파일을 올리면 함께 올라갑니다.</p>
    ${flow("AI가 만든 md에 그림: 줄이 들어 있음", "📤 문항 세트 올리기 → 🔎 검사만 하기", "그림 오류가 있으면 줄 번호와 함께 알려 줌", "📤 검사 후 저장", "학생 문제 창에서 바로 움직이는 그림")}
    <table class="mn-table"><thead><tr><th></th><th>코드 그림 (그림: 한 줄)</th><th>그림 파일 (사진)</th></tr></thead><tbody>
      <tr><td>크기</td><td><b>100바이트 안팎</b></td><td>수십~수백 KB</td></tr>
      <tr><td>학생 조작</td><td>끌기·조절기·재생·돌려 보기</td><td>보기만</td></tr>
      <tr><td>올리는 곳</td><td>md 파일 안 (따로 올리지 않음)</td><td>🖼️ 그림 파일 올리기 → /img/… 주소를 md에</td></tr>
      <tr><td>고칠 때</td><td>md의 그 줄만 고쳐 다시 올림</td><td>새 그림을 올리고 주소를 바꿈</td></tr>
    </tbody></table>
    ${keys("AI가 다른 코드를 줬다면", ["파이썬(matplotlib)·지오지브라·데스모스 코드는 올릴 수 없습니다.", "아래 프롬프트로 <b>그림: 문법으로 옮겨 달라</b>고 하세요.", "사진처럼 코드로 못 그리는 것만 그림 파일로: <b>webp, 가로 1000px 이하, 200KB 이하</b>. 교사 화면에서 올릴 때도 자동으로 webp로 줄입니다."])}
    <textarea id="mn-code" class="mn-out" readonly rows="5">아래 그래프 코드(또는 그림 설명)를 '벡터 유적 탈출'의 그림: 한 줄 문법으로 옮겨 주세요.
- 학생이 [무엇]을 움직여 [어떤 개념]을 보게 하고, 문제의 수치와 맞춥니다.
- 결과는 "그림:" 줄과 "조작:" 줄만 주세요. 코드로 못 그리는 부분이 있으면 webp 그림 파일로 대신할 곳을 따로 적어 주세요.
(여기에 받은 코드나 그림 설명 붙여 넣기)
${GRAMMAR.base}
${GRAMMAR.graph}</textarea>
    <div class="mn-row">${copyBtn("mn-code", "📋 코드 → 그림: 줄 바꾸기 프롬프트 복사")}</div>` },
  { part: "make", title: "검사하고 고치기", html: `
    ${flow("📤 문항 세트 올리기에서 파일 고르기", "🔎 검사만 하기", "오류 문장 복사", "아래 프롬프트와 함께 AI에게", "다시 검사 → 📤 검사 후 저장")}
    <textarea id="mn-fix" class="mn-out" readonly rows="3">업로드 검사에서 아래 오류가 나왔습니다. 첨부한 md 파일에서 해당 부분만 고쳐 전체 파일을 다시 주세요.
(여기에 교사 화면의 오류 문장을 그대로 붙여 넣기)</textarea>
    <div class="mn-row">${copyBtn("mn-fix", "📋 오류 고치기 프롬프트 복사")}</div>
    <textarea id="mn-fig" class="mn-out" readonly rows="4">첨부한 md 파일에서 [상자 N의 중]의 그림: 줄만 다시 만들어 주세요.
- 목적: 학생이 [무엇]을 움직이며 [어떤 개념]을 발견하게 하기
- 문제의 수치와 맞추고, 그림: 줄과 조작: 줄만 바꾼 결과를 주세요.
${GRAMMAR.base}</textarea>
    <div class="mn-row">${copyBtn("mn-fig", "📋 그림만 바꾸기 프롬프트 복사")}</div>` },
  { part: "make", title: "다른 교과 선생님께", html: `
    <table class="mn-table"><thead><tr><th>교과</th><th>추천 구성</th></tr></thead><tbody>
      <tr><td>과학</td><td>그래프(시간-속도, 넓이=이동 거리), 모션, 단답형(용어), 인물 카드(과학자). <code>수식: 끔</code>, 공식은 <code>$...$</code></td></tr>
      <tr><td>사회·역사</td><td>그림 파일(지도·사료), 고르기·오지선다, 단답형(인물·사건), 인물 카드</td></tr>
      <tr><td>국어·영어</td><td>그림 없음 또는 그림 파일, 오지선다·합답형, 단답형, 인물 카드(작가). <code>수식: 끔</code></td></tr>
      <tr><td>정보</td><td>조작 그림(좌표·그래프), 단답형, 오지선다</td></tr>
    </tbody></table>
    ${keys("다른 교과에서 바뀌는 것", ["수학이 아닌 교과는 글 속 수식 자동 변환이 꺼집니다(영어 문장이 수식 글꼴로 바뀌지 않음).", "<b>단답형</b>: 띄어쓰기·대소문자 무시, 여러 정답은 <code>|</code>로", "<b>인물 카드</b>를 넣으면 수정을 깰 때 기본 수학자 대신 그 인물이 나옵니다.", "'다른 교과 예시 (과학)' 파일을 AI에게 함께 주세요."])}` },
];

let idx = 0;
export function openManual(start = 0) {
  const pop = document.querySelector("#manual-pop");
  if (!pop) return;
  if (!pop.dataset.built) build(pop);
  pop.hidden = false;
  show(start);
}

function build(pop) {
  pop.dataset.built = "1";
  const partOf = (k) => SLIDES.findIndex((x) => x.part === k);
  pop.innerHTML = `<div class="manual-card" role="document">
      <div class="manual-head">
        <h2>📘 사용 설명서</h2>
        <div class="manual-tabs" role="tablist">
          <button type="button" class="manual-tab" data-part="class" data-go="${partOf("class")}">🎮 수업 운영 (모의 진행)</button>
          <button type="button" class="manual-tab" data-part="make" data-go="${partOf("make")}">🤖 AI로 문항 만들기</button>
        </div>
        <button class="btn" type="button" data-close aria-label="닫기">✕</button>
      </div>
      <div class="manual-track">${SLIDES.map((s, i) => `<section class="manual-slide" data-i="${i}" hidden><h3><span class="mn-num">${i + 1} / ${SLIDES.length}</span>${esc(s.title)}</h3>${s.html}</section>`).join("")}</div>
      <div class="manual-nav">
        <button class="btn" type="button" data-prev>← 이전</button>
        <div class="manual-dots">${SLIDES.map((s, i) => `<button type="button" class="manual-dot ${s.part}" data-go="${i}" aria-label="${esc(s.title)}" title="${esc(s.title)}"></button>`).join("")}</div>
        <button class="btn primary" type="button" data-next>다음 →</button>
      </div>
      <div class="manual-zoom" hidden><img alt=""><p></p></div>
    </div>`;
  const zoom = pop.querySelector(".manual-zoom");
  pop.addEventListener("click", (e) => {
    if (e.target === pop) { pop.hidden = true; return; }
    if (e.target.closest(".manual-zoom")) { zoom.hidden = true; return; }
    if (e.target.matches("img[data-zoom]")) {
      zoom.querySelector("img").src = e.target.src;
      zoom.querySelector("p").textContent = e.target.alt + " (누르면 닫혀요)";
      zoom.hidden = false;
      return;
    }
    const t = e.target.closest("button");
    if (!t) return;
    if (t.hasAttribute("data-close")) pop.hidden = true;
    else if (t.hasAttribute("data-prev")) show(idx - 1);
    else if (t.hasAttribute("data-next")) show(idx + 1);
    else if (t.dataset.go) show(Number(t.dataset.go));
    else if (t.dataset.click) document.querySelector(t.dataset.click)?.click();
    else if (t.dataset.copy) {
      const el = document.getElementById(t.dataset.copy);
      navigator.clipboard?.writeText(el.value ?? el.textContent).then(() => { const old = t.textContent; t.textContent = "✅ 복사됨"; setTimeout(() => { t.textContent = old; }, 1500); });
    }
  });
  window.addEventListener("keydown", (e) => {
    if (pop.hidden || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "ArrowLeft") show(idx - 1);
    else if (e.key === "Escape") { if (!zoom.hidden) zoom.hidden = true; else pop.hidden = true; }
  });
  // 프롬프트 생성기
  const gen = () => {
    const val = (id) => pop.querySelector(id)?.value ?? "";
    const checked = (name) => [...pop.querySelectorAll(`input[name="${name}"]:checked`)].map((x) => x.value);
    const figs = checked("mg-fig");
    pop.querySelector("#mg-images-wrap").hidden = !figs.includes("image");
    pop.querySelector("#mg-out").value = buildPrompt({
      subject: val("#mg-subject"), unit: val("#mg-unit"), pages: val("#mg-pages"), file: val("#mg-file"), stage: val("#mg-stage"),
      math: val("#mg-math"), figs, kinds: checked("mg-kind"), people: pop.querySelector("#mg-people").checked, images: val("#mg-images"),
    });
  };
  pop.querySelectorAll(".mn-form input, .mn-form select").forEach((el) => el.addEventListener("input", gen));
  gen();
}

function show(i) {
  const pop = document.querySelector("#manual-pop");
  idx = Math.max(0, Math.min(SLIDES.length - 1, i));
  pop.querySelectorAll(".manual-slide").forEach((s) => { s.hidden = Number(s.dataset.i) !== idx; });
  pop.querySelectorAll(".manual-dot").forEach((d, k) => d.classList.toggle("on", k === idx));
  pop.querySelectorAll(".manual-tab").forEach((t) => t.classList.toggle("on", t.dataset.part === SLIDES[idx].part));
  pop.querySelector("[data-prev]").disabled = idx === 0;
  pop.querySelector("[data-next]").disabled = idx === SLIDES.length - 1;
  pop.querySelector(".manual-track").scrollTop = 0;
}

// 다른 화면에서 특정 부분을 바로 열 때: openManualPart("make")
export function openManualPart(part) {
  openManual(Math.max(0, SLIDES.findIndex((x) => x.part === part)));
}
