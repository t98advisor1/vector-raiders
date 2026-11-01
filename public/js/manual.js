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

const SLIDES = [
  {
    title: "1. 한눈에 보기",
    html: `<p>교과서 파일을 AI에게 주고 <b>md 파일 한 개</b>를 받아 올리면, 그 채널의 게임 문항·개념 카드·그림·인물 카드·출력물이 모두 바뀝니다.</p>
      <ol class="mn-flow">
        <li><b>📄 교과서 준비</b><span>필요한 소단원 쪽만 PDF로</span></li>
        <li><b>📥 예시 파일 받기</b><span>수학 또는 다른 교과 예시 md</span></li>
        <li><b>🤖 AI에게 요청</b><span>교과서 + 예시 + 프롬프트 (3단계)</span></li>
        <li><b>🔎 검사만 하기</b><span>형식·정답·그림을 서버가 점검</span></li>
        <li><b>📤 저장·적용</b><span>내 채널에만 적용, 변경 기록 자동</span></li>
        <li><b>🎮 수업·🖨️ 출력</b><span>게임, 형성평가, 해설집, 카드</span></li>
      </ol>
      <p class="mn-tip">💡 머지나 배포는 필요 없습니다. 교사 화면에서 올리면 바로 반영됩니다.</p>`,
  },
  {
    title: "2. md 파일이 게임에서 어디에 나오나요?",
    html: `<table class="mn-table"><thead><tr><th>md 파일</th><th>게임 화면</th></tr></thead><tbody>
      <tr><td><code># 상자 1 ~ 9</code>, <code>- 방: 1~4</code></td><td>방마다 놓인 상자 9개 (방 1: 상자 1~3, 방 2: 4~5, 방 3: 6~7, 방 4: 8~9)</td></tr>
      <tr><td><code>## 하 / 중 / 상</code></td><td>상자를 열면 고르는 난이도 (70 / 100 / 150점)</td></tr>
      <tr><td><code>- 협업: 예</code> + <code>조건 ㉠ ㉡</code></td><td>상 난이도에서 두 학생이 조건을 하나씩 받아 채팅으로 함께 풀기</td></tr>
      <tr><td><code>그림:</code> + <code>조작:</code></td><td>문제 창의 움직이는 그림과 안내 문장 (끌기·조절기·그래프·재생)</td></tr>
      <tr><td><code># 핵심 카드</code> + <code>- 비석:</code></td><td>방 안 비석을 열면 나오는 개념 카드, 상자 머리의 <code>- 개념:</code>과 연결</td></tr>
      <tr><td><code># 인물 카드</code></td><td>수정을 깨면 나오는 인물 이야기 (없으면 기본 수학자)</td></tr>
      <tr><td><code>풀이:</code></td><td>두 번 틀리면 보이는 힌트, 해설집·풀이 기록 출력</td></tr>
    </tbody></table>`,
  },
  {
    title: "3. 교과서 파일은 PDF로 주세요",
    html: `<table class="mn-table"><thead><tr><th>가진 파일</th><th>이렇게 주세요</th><th>이유</th></tr></thead><tbody>
      <tr><td>📕 출판사 교과서 PDF</td><td><b>그대로 (권장)</b>. 필요한 소단원 쪽만 잘라서</td><td>대부분의 AI가 글·그림·표·수식을 함께 읽습니다</td></tr>
      <tr><td>📘 한글 파일 (hwp·hwpx)</td><td>한글에서 <b>파일 → PDF로 저장</b> 후 PDF를 주기</td><td>AI 대부분이 hwpx를 바로 읽지 못하거나 수식·그림이 빠집니다</td></tr>
      <tr><td>📷 사진·스캔본</td><td>쪽마다 반듯하게, 밝게</td><td>수식·숫자를 잘못 읽을 수 있어 정답 검산을 꼭 하세요</td></tr>
      <tr><td>📝 학습지·교사용 자료</td><td>PDF로 저장해 함께 주기</td><td>문제 유형과 수업 의도를 AI가 더 잘 따라 합니다</td></tr>
    </tbody></table>
    <ul class="mn-list">
      <li>한 번에 <b>20~30쪽 이하</b>, 해당 소단원의 개념·예제·문제 쪽만 주는 것이 가장 정확합니다.</li>
      <li>교과서 숫자를 그대로 쓰지 않도록 프롬프트에 "숫자는 새로 정한다"가 들어가 있습니다(저작권).</li>
      <li>사진·지도·작품 이미지가 꼭 필요하면 먼저 <b>🖼️ 그림 파일 올리기</b>로 올리고, 받은 <code>/img/…</code> 주소를 프롬프트에 적어 주세요.</li>
    </ul>`,
  },
  {
    title: "4. 예시 파일 받기",
    html: `<p>AI는 형식을 말로 들을 때보다 <b>예시 파일 하나</b>를 볼 때 훨씬 정확하게 따라 합니다. 교과서와 함께 꼭 첨부하세요.</p>
      <div class="mn-row">
        <button class="btn" type="button" data-click="#set-example">📄 수학 예시 (벡터 3-1)</button>
        <button class="btn" type="button" data-click="#set-example-other">📄 다른 교과 예시 (과학 · 운동과 에너지)</button>
      </div>
      <ul class="mn-list">
        <li><b>수학 예시</b>: 벡터 표기([AB], {a}), 조작 그림, 합답형 ㄱㄴㄷ, 협업 문항</li>
        <li><b>다른 교과 예시</b>: <code>수식: 끔</code>, 단답형(글자 답), 고르기(낱말), 그래프·넓이·접선, 모션, 인물 카드</li>
      </ul>`,
  },
  {
    title: "5. 프롬프트 만들기",
    gen: true,
    html: `<p>상황을 고르면 AI에게 줄 프롬프트를 만들어 줍니다. <b>1단계 → 2단계 → 3단계</b> 순서로 하나씩 요청하고, 단계마다 결과를 확인한 뒤 다음으로 넘어가세요.</p>
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
        <label class="mn-wide" id="mg-images-wrap" hidden>올린 그림 주소와 설명 <input id="mg-images" placeholder="예: /img/a1b2c3d4e5f6.png 세포 사진, /img/…png 조선 지도"></label>
        <fieldset><legend>답 형식</legend>
          <label><input type="checkbox" name="mg-kind" value="num" checked> 숫자</label>
          <label><input type="checkbox" name="mg-kind" value="choice" checked> 오지선다·합답형</label>
          <label><input type="checkbox" name="mg-kind" value="set"> 고르기</label>
          <label><input type="checkbox" name="mg-kind" value="text"> 단답형(글자)</label>
          <label><input type="checkbox" name="mg-kind" value="vec"> 벡터식</label>
        </fieldset>
        <label><input type="checkbox" id="mg-people" checked> 인물 카드 넣기 (수정을 깨면 나오는 인물 이야기)</label>
      </div>
      <textarea id="mg-out" class="mn-out" readonly rows="12"></textarea>
      <div class="mn-row">${copyBtn("mg-out", "📋 프롬프트 복사")}<span class="muted">→ AI 채팅에 교과서 PDF와 예시 md를 첨부하고 붙여 넣으세요.</span></div>`,
  },
  {
    title: "6. 1단계: 설계표 받기",
    html: `<p>문제부터 만들지 않고, 먼저 <b>상자 9개의 개념과 조작 아이디어</b>를 표로 받습니다. 이 게임의 핵심은 개념 학습과 직접 조작이기 때문입니다.</p>
      <table class="mn-table"><thead><tr><th>확인할 것</th><th>좋은 예</th></tr></thead><tbody>
        <tr><td>개념 순서</td><td>교과서 순서대로, 방 1 → 방 4로 갈수록 깊어짐</td></tr>
        <tr><td>조작 아이디어</td><td>"a를 움직이면 접선 기울기가 바뀌고, 그 값이 미분계수다" (움직여서 발견)</td></tr>
        <tr><td>협업 조건</td><td>조건 ㉠만으로도 ㉡만으로도 풀 수 없고, 둘을 합쳐야 풀림</td></tr>
      </tbody></table>
      <p class="mn-tip">💡 고칠 점은 이 단계에서 말하세요. 문항을 다 만든 뒤 고치는 것보다 훨씬 쉽습니다. 예: "상자 4의 조작 아이디어를 넓이 대신 접선으로 바꿔 주세요."</p>`,
  },
  {
    title: "7. 2단계: 핵심 카드와 인물 카드",
    html: `<pre class="mn-code"># 핵심 카드 · 미분계수
- 비석: 4
그림: 평면 범위=-1,4,-1,9 곡선=x^2 슬라이더=a,0,3,0.5 접선=1,a 보기=기울기:d1(a)
요약: 곡선 위 한 점에서 그은 접선의 기울기를 그 점의 미분계수라고 해요.
- 그림의 a를 움직이며 접선 기울기가 어떻게 바뀌는지 보세요.

# 인물 카드 · 아이작 뉴턴 (Isaac Newton)
- 시대: 1643 ~ 1727 (영국)
- 업적: 미적분과 운동 법칙
- 분야: 📈 미적분
이야기: 순간의 변화를 계산하는 방법(유율법)을 만들어 …</pre>
      <ul class="mn-list">
        <li>카드 제목은 상자 머리의 <code>- 개념:</code>과 똑같아야 연결됩니다.</li>
        <li>카드의 <code>그림:</code>은 선택이지만, 넣으면 비석에서 바로 조작해 볼 수 있습니다.</li>
        <li>인물 카드가 없으면 기본 수학자 카드(데카르트·오일러 등)가 나옵니다.</li>
      </ul>`,
  },
  {
    title: "8. 3단계: 문항과 그림 고르기",
    html: `<table class="mn-table"><thead><tr><th>이런 수업이면</th><th>그림 줄 예</th></tr></thead><tbody>
      <tr><td>벡터·도형 (끌어 보기)</td><td><code>평면 A=1,3 B=5,1 끌기=A,B 화살표=AB 보기=|AB|</code></td></tr>
      <tr><td>함수 그래프 (계수 바꾸기)</td><td><code>평면 범위=-3,3,-2,6 곡선=a*x^2 슬라이더=a,-2,2,0.5</code></td></tr>
      <tr><td>미분 (접선)</td><td><code>곡선=x^3-3*x 슬라이더=a,-2,2,0.25 접선=1,a 보기=기울기:d1(a)</code></td></tr>
      <tr><td>적분 (넓이)</td><td><code>곡선=x^2 슬라이더=b,0,3,0.5 넓이=1,0,b 보기=넓이:int1(0,b)</code></td></tr>
      <tr><td>시뮬레이션 (저절로 움직임)</td><td><code>P=(1-t)*A+t*B 슬라이더=t,0,1,0.1 자취=P 재생=t,4</code></td></tr>
      <tr><td>공간 도형 (돌려 보기)</td><td><code>공간 직육면체=3,4,2 화살표=AG 재생=회전,10</code></td></tr>
      <tr><td>사진·지도·작품</td><td><code>그림: /img/…</code> (그림 파일 올리기)</td></tr>
    </tbody></table>
    <p class="mn-tip">🔒 md 파일에 자바스크립트 같은 프로그램 코드를 직접 넣는 방식은 받지 않습니다. 올린 코드는 모든 학생 기기에서 실행되기 때문입니다. 위 그림 문법으로 대부분의 시뮬레이션을 만들 수 있고, 업로드 검사에서 오류를 미리 찾아 줍니다.</p>`,
  },
  {
    title: "9. 검사하고 고치기",
    html: `<ol class="mn-list">
        <li>AI가 준 md 파일을 <b>📤 문항 세트 올리기</b>에서 고르고 <b>🔎 검사만 하기</b>를 누릅니다.</li>
        <li>서버가 형식(상자 9개, 하·중·상, 협업 조건, 보기 5개), <b>정답 채점</b>, <b>그림 줄</b>을 모두 점검합니다.</li>
        <li>오류가 나오면 오류 문장을 복사해 아래 프롬프트와 함께 AI에게 주세요.</li>
      </ol>
      <textarea id="mn-fix" class="mn-out" readonly rows="4">업로드 검사에서 아래 오류가 나왔습니다. 첨부한 md 파일에서 해당 부분만 고쳐 전체 파일을 다시 주세요.
(여기에 교사 화면의 오류 문장을 그대로 붙여 넣기)</textarea>
      <div class="mn-row">${copyBtn("mn-fix")}</div>
      <textarea id="mn-fig" class="mn-out" readonly rows="5">첨부한 md 파일에서 [상자 N의 중]의 그림: 줄만 다시 만들어 주세요.
- 목적: 학생이 [무엇]을 움직이며 [어떤 개념]을 발견하게 하기
- 문제의 수치와 맞추고, 그림: 줄과 조작: 줄만 바꾼 결과를 주세요.
${GRAMMAR.base}</textarea>
      <div class="mn-row">${copyBtn("mn-fig", "📋 그림만 바꾸기 프롬프트 복사")}</div>`,
  },
  {
    title: "10. 저장·적용·기록·출력",
    html: `<ul class="mn-list">
        <li><b>📤 검사 후 저장</b> → 중간관리자가 올린 세트는 <b>그 채널에만</b> 보이고, 저장 직후 "지금 적용할까요?"를 묻습니다. 적용하면 새 수업으로 시작하니 먼저 CSV를 받아 두세요.</li>
        <li>전체 관리자가 올린 세트는 모든 채널의 "이 채널 단원" 목록에 나옵니다.</li>
        <li><b>📜 문항 변경 기록</b>: 올림·지움·단원 바꿈이 자동으로 남고 CSV로 받을 수 있습니다.</li>
        <li><b>🖨️ 출력</b>: 형성평가 문제지·답지(2단, 그림 포함), 핵심 카드, 교사용 해설집. 학생은 탈출 후 풀이 기록·오답 정리를 출력합니다.</li>
        <li>적용한 뒤에는 학생 화면에서 상자 2~3개와 비석 1~2개를 직접 열어, 그림이 문제와 맞는지 확인하세요.</li>
      </ul>`,
  },
  {
    title: "11. 다른 교과 선생님께",
    html: `<table class="mn-table"><thead><tr><th>교과</th><th>추천 구성</th></tr></thead><tbody>
      <tr><td>과학</td><td>그래프(시간-속도, 넓이=이동 거리), 모션, 단답형(용어), 인물 카드(과학자). <code>수식: 끔</code>, 공식은 <code>$...$</code></td></tr>
      <tr><td>사회·역사</td><td>그림 파일(지도·사료 사진), 고르기·오지선다, 단답형(인물·사건), 인물 카드</td></tr>
      <tr><td>국어·영어</td><td>그림 없음 또는 그림 파일, 오지선다·합답형, 단답형, 인물 카드(작가). 영어 문장이 수식으로 바뀌지 않게 <code>수식: 끔</code></td></tr>
      <tr><td>정보</td><td>조작 그림(좌표·그래프), 단답형, 오지선다</td></tr>
    </tbody></table>
    <p class="mn-tip">💡 "다른 교과 예시 (과학)" 파일을 AI에게 함께 주면, 수학 기호 없이 같은 형식을 따라 합니다.</p>`,
  },
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
  pop.innerHTML = `<div class="manual-card" role="document">
      <div class="manual-head"><h2>📘 AI로 문항 세트 만들기</h2><button class="btn" type="button" data-close aria-label="닫기">✕</button></div>
      <div class="manual-track">${SLIDES.map((s, i) => `<section class="manual-slide" data-i="${i}" hidden><h3>${esc(s.title)}</h3>${s.html}</section>`).join("")}</div>
      <div class="manual-nav">
        <button class="btn" type="button" data-prev>← 이전</button>
        <div class="manual-dots">${SLIDES.map((s, i) => `<button type="button" class="manual-dot" data-go="${i}" aria-label="${esc(s.title)}"></button>`).join("")}</div>
        <button class="btn primary" type="button" data-next>다음 →</button>
      </div>
    </div>`;
  pop.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (e.target === pop || t?.dataset.close !== undefined && t?.hasAttribute("data-close")) { pop.hidden = true; return; }
    if (!t) return;
    if (t.hasAttribute("data-prev")) show(idx - 1);
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
    else if (e.key === "Escape") pop.hidden = true;
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
  pop.querySelector("[data-prev]").disabled = idx === 0;
  pop.querySelector("[data-next]").disabled = idx === SLIDES.length - 1;
}
