// 교사용 사용 설명서: 수업 운영 과정을 캐러셀로 보여 준다.
// 화면 글자만 다루고 서버와는 통신하지 않는다.

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const copyBtn = (id, label = "📋 복사") => `<button class="btn copy-btn" type="button" data-copy="${id}">${label}</button>`;
// 화면 그림 (6인 모의 진행 캡처). 누르면 크게 본다.
const shot = (name, cap) => `<figure class="mn-shot"><img src="/img/manual/${name}.webp" alt="${esc(cap)}" loading="lazy" data-zoom><figcaption>${cap}</figcaption></figure>`;
const shots = (...list) => `<div class="mn-shots n${list.length}">${list.map(([n, c]) => shot(n, c)).join("")}</div>`;
const keys = (title, items) => `<div class="mn-keys"><b>✅ ${title}</b><ul>${items.map((t) => `<li>${t}</li>`).join("")}</ul></div>`;
const flow = (...steps) => `<ol class="mn-steps">${steps.map((t) => `<li>${t}</li>`).join("")}</ol>`;
const tip = (t) => `<p class="mn-tip">${t}</p>`;

// 수업 운영 (6인 모의 진행: A팀 3명, B팀 3명, 교사 1명)
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
  { part: "class", title: "2. 학생 입장: 채널 → 팀 → 이름·닉네임", html: `
    ${shots(["s-menu", "① '수업 참가' 고르기"], ["s-channel", "② 채널 고르기"], ["s-team", "③ 팀 고르기 (최대 8명)"], ["s-name", "④ 번호·이름과 닉네임 쓰기"])}
    ${keys("안내할 말", ["\"수업 참가 → 선생님이 말한 채널 → 우리 팀(A·B·C) → <b>번호+이름</b>(예: 1번 이서연)과 <b>닉네임</b>\"", "친구들에게는 닉네임만 보이고, 교사 화면에는 '닉네임 (이름)'으로 보입니다.", "<b>개인전 채널</b>은 팀 없이 8명이 겨룹니다. 먼저 들어온 학생이 방장이 되어 시작하고, 8명이 차면 관람(15명까지)으로 들어갑니다.", "새로고침하거나 연결이 끊겨도 같은 기기에서는 기록이 이어집니다.", "연습 모드는 혼자 하는 복습용이라 교사 화면에 남지 않습니다."])}` },
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
  { part: "class", title: "11. 60분 종료와 다음 반 수업", html: `
    ${flow("CSV 내려받기", "💬 채팅 기록 받기", "새 수업 시작 (기록 지우기)", "필요하면 단원 바꾸기", "학생 입장")}
    ${keys("기억할 것", ["새 수업 시작·단원 바꾸기는 그 채널의 기록을 지웁니다. 먼저 내려받으세요.", "단원을 바꾸면 <b>📜 문항 변경 기록</b>에 자동으로 남고 CSV로 받을 수 있습니다.", "<b>모든 방은 첫 학생이 들어온 뒤 60분</b>이 지나면 모두 나가게 되고 기록이 초기화됩니다. 학생 화면 위쪽에 남은 시간이 보입니다.", "<b>팀전 채널</b>은 끝나기 직전의 결과표(CSV)를 교사 화면이 자동으로 내려받습니다. 교사 화면을 켜 두세요(닫혀 있었으면 다음에 열 때 받습니다)."])}` },

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

// 다른 화면에서 특정 부분을 바로 열 때: openManualPart("class")
export function openManualPart(part) {
  openManual(Math.max(0, SLIDES.findIndex((x) => x.part === part)));
}
