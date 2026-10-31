import { connect } from "./net.js";
import { fmt, watchMath } from "./mathtext.js";
import { PROBLEMS } from "./problems.js";
import { LAB_LEVELS } from "./lab.js";
import { renderClassBar } from "./classbar.js";
import { ROOMS, BRIDGES, roomAt } from "./game.js";
import { DIAGRAMS } from "./diagrams.js";

const $ = (s) => document.querySelector(s);
// 수업 채널 1~5: 채널마다 완전히 분리된 수업 유적(Durable Object class:1~5)이다.
const CHANNELS = ["1", "2", "3", "4", "5"];
const STAGE_TEXT = { lobby: "⏸ 대기", play: "▶ 탐험 중", done: "■ 탐험 끝" };
let net = null, last = null, answers = null;
const conns = {}; // 채널 번호 → 연결 (5개 채널을 동시에 둘러본다)
const pwByCh = {}; // 채널 번호 → 로그인 비밀번호 (joined 뒤 기억해 두기)
const dashByCh = {}; // 채널 번호 → 마지막 받은 대시보드 (통합 뷰용)
const chatLog = []; // 학생 채팅 누적: { at, ch, name, team, text }
let activeCh = (() => { try { return sessionStorage.getItem("vr-teacher-ch") ?? "1"; } catch { return "1"; } })();
if (!CHANNELS.includes(activeCh)) activeCh = "1";
const expanded = new Set(); // 펼쳐 본 학생
const STAGE_NAME = { lobby: "⏸ 대기 중", play: "▶ 탐험 중", done: "■ 탐험 끝" };
watchMath();

// 비밀번호는 이 탭을 닫으면 잊는다.
const remember = (pw) => {
  try {
    pw === null ? sessionStorage.removeItem("vr-teacher") : sessionStorage.setItem("vr-teacher", pw);
    const apw = $("#admin-pw-display");
    if (apw) apw.textContent = pw || "1234";
  } catch {}
};
const remembered = (() => { try { return sessionStorage.getItem("vr-teacher"); } catch { return null; } })();
if (remembered) start(remembered);

$("#login").addEventListener("submit", (e) => {
  e.preventDefault();
  const pw = $("#password").value;
  if (pw) start(pw);
});

$("#reset").onclick = () => {
  if (!last) return;
  const n = last.students.length;
  if (!confirm(`학생 ${n}명의 기록을 모두 지우고 새 수업을 시작할까요?
먼저 CSV를 내려받아 두면 기록을 보관할 수 있어요.`)) return;
  net?.send({ type: "reset" });
};

$("#csv").onclick = () => { if (last) downloadCsv(last); };

// 학생 채팅 기록 다운로드: 지금까지 받은 모든 채팅을 UTF-8 BOM CSV로 내려 준다.
$("#chat-download").onclick = () => {
  if (!chatLog.length) return alert("아직 받은 채팅이 없어요. 수업이 시작되면 학생들의 채팅이 여기에 쌓여요.");
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["시각", "채널", "팀", "이름", "내용"];
  const rows = chatLog.map((c) => [
    new Date(c.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    `${c.ch}채널`, c.team ? `${c.team}팀` : "", c.name, c.text,
  ]);
  const csv = "\ufeff" + [head, ...rows].map((r) => r.map(q).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `학생채팅기록_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

// 진행 제어: 이 채널의 탐험을 시작·대기·종료한다.
for (const btn of document.querySelectorAll(".stage-ctl[data-stage]"))
  btn.onclick = () => net?.send({ type: "stage", stage: btn.dataset.stage });

// 학생 초대 링크 복사: 지금 보고 있는 채널의 접속 주소를 클립보드에 넣는다.
$("#invite-copy").onclick = async () => {
  const url = `${location.origin}/?ch=${activeCh}`;
  try { await navigator.clipboard.writeText(url); $("#invite-copy").textContent = "✅ 복사했어요"; }
  catch { prompt("아래 주소를 복사해 학생들에게 알려 주세요.", url); }
  setTimeout(() => { $("#invite-copy").textContent = "📋 학생 초대 링크 복사"; }, 1500);
};

// 교사용 문제·정답·해설 PDF: 인쇄 창에 'PDF로 저장'하면 파일로 내려받는다.
$("#print-sheet-btn").onclick = () => {
  if (!answers) return alert("먼저 접속한 뒤에 출력할 수 있어요. 비밀번호를 입력하고 들어가 주세요.");
  printSheet();
};

function printSheet() {
  const rows = PROBLEMS.map((p, i) => {
    const s = last?.stats?.[p.id];
    const wrong = s?.topWrong?.length ? s.topWrong.map(([w, n]) => `${w} (${n}명)`).join(", ") : "아직 응답 없음";
    const diagram = DIAGRAMS[p.id] ? `<div class="tp-diagram">${DIAGRAMS[p.id]}</div>` : "";
    return `
      <section class="tp-item">
        <div class="tp-item-header">
          <h3>${i + 1}. ${p.icon} ${p.relic} <small>${p.level} · 교과서 ${p.source}</small></h3>
        </div>
        <div class="tp-item-body">
          <p class="tp-text"><b>[문제]</b> ${fmt(p.text)}</p>
          ${diagram}
          <div class="tp-ans-block">
            <span class="tp-answer"><b>정답:</b> ${fmt(answers[p.id] ?? "–")}</span>
          </div>
          <p class="tp-solution"><b>[상세 풀이]</b> ${fmt(p.hint)}</p>
          <p class="tp-wrong"><b>[수업 팁·오답 분석]</b> ${wrong}</p>
        </div>
      </section>`;
  }).join("");
  // 벡터 실험실(장애물) 지도 팁: 어느 방의 어떤 위험지대가 어떤 실험으로 열리는지
  const HAZ = { "~": "물", "^": "절벽", "!": "용암" };
  const labTips = Object.values(BRIDGES).map((br) => {
    const lv = LAB_LEVELS.find((l) => l.id === br.lab);
    return `<li><b>${br.title}</b> — ${ROOMS[roomAt(br.cx)].name}의 ${HAZ[br.hazard] ?? "위험지대"} 구간. 벡터 실험실 '${lv?.title ?? br.lab}' 단계를 완료하면 길이 생겨요.</li>`;
  }).join("");
  const sheet = $("#teacher-print-sheet");
  sheet.innerHTML = `
    <header class="tp-head">
      <div class="tp-head-left">
        <h1>2026학년도 기하 Ⅲ-1 벡터의 연산 교사용 문제·정답·해설집</h1>
        <p>수업 유적 탐험 형성평가 문항 해설 · 접속 주소: ${location.origin}/?ch=${activeCh}</p>
      </div>
      <div class="tp-head-meta">
        <div><b>채널:</b> ${activeCh}번 채널</div>
        <div><b>참여 학생:</b> ${last?.students?.length ?? 0}명</div>
        <div><b>일시:</b> ${new Date().toLocaleDateString("ko-KR")}</div>
      </div>
    </header>
    <section class="tp-labs">
      <h2>🗺️ 벡터 실험실 지도 가이드</h2>
      <ul>${labTips}</ul>
      <p class="tp-tip">※ 모든 문은 해당 구역 열쇠 조각(문제)을 반의 70%가 해결하면 열리며, 7개 유물은 반 전체 협동으로 완성합니다.</p>
    </section>
    <div class="tp-columns">
      ${rows}
    </div>`;
  sheet.hidden = false;
  // 수식(MathJax) 조판이 끈 뒤 인쇄 창을 연다
  setTimeout(() => {
    window.print();
    setTimeout(() => { sheet.hidden = true; }, 300);
  }, 600);
}

function start(password) {
  net?.close();
  for (const ch of CHANNELS) openChannel(ch, password);
  $("#setup-error").textContent = "";
  $("#join-url").textContent = `${location.origin}/?ch=${activeCh}`;
  buildChannelTabs();
}

// 채널 하나와 연결한다. 5개 채널을 모두 연결해 두면 통합 대시보드에서 활성 학생 수를 실시간으로 볼 수 있다.
function openChannel(ch, password) {
  conns[ch]?.close();
  pwByCh[ch] = password;
  conns[ch] = connect(
    () => ({ type: "hello", role: "teacher", password }),
    (msg) => onChannelMessage(ch, msg),
    (kind, code) => onChannelStatus(ch, kind, code),
    `?ch=${ch}`,
  );
  if (ch === activeCh) net = conns[ch];
}

function onChannelMessage(ch, msg) {
  if (msg.type === "joined") {
    remember(pwByCh[ch] ?? null); // 비밀번호는 탭을 닫을 때까지 기억한다
    answers = msg.answers ?? null;
    $("#problems").replaceChildren(); // 정답을 받았으니 문제 카드를 새로 그린다
    buildAnswerSheet(); // 문제·정답 일람표도 정답을 받은 뒤에 그린다
    $("#setup").hidden = true;
    $("#dash").hidden = false;
  } else if (msg.type === "dashboard") {
    dashByCh[ch] = msg;
    if (ch === activeCh) { last = msg; $("#stage-chip").textContent = STAGE_NAME[msg.stage] ?? ""; renderTeams(msg.teams); renderKpis(msg); renderDash(msg); }
    renderOverview();
  } else if (msg.type === "class") {
    if (ch === activeCh) renderClassBar($("#class-bar"), msg, { showEnergy: true, showShelf: true });
  } else if (msg.type === "chat") {
    // 학생 채팅 누적 (모든 채널) — [💬 학생 채팅 기록 다운로드]로 내려받는다
    chatLog.push({ at: Date.now(), ch, name: msg.name, team: msg.team, text: msg.text });
    if (chatLog.length > 3000) chatLog.splice(0, chatLog.length - 3000);
    $("#chat-download").textContent = `💬 학생 채팅 기록 다운로드 (${chatLog.length})`;
  } else if (msg.type === "error") {
    $("#setup-error").textContent = msg.message;
  }
}

function onChannelStatus(ch, kind, code) {
  if (ch !== activeCh) return;
  $("#conn-chip").textContent = kind === "open" ? "🟢 연결됨" : kind === "retry" ? "🟡 다시 연결 중" : "🔴 연결 끊김";
  if (kind === "final") {
    $("#dash").hidden = true;
    $("#setup").hidden = false;
    if (code === 4003) remember(null); // 비밀번호가 틀리면 잊고 다시 묻는다
    if (code === 4000) $("#setup-error").textContent = "지난 수업 기록이 정리되었어요. 다시 들어와 주세요.";
  }
}

// ---------- 채널 전환 탭 · 통합 대시보드 ----------
function buildChannelTabs() {
  const tabs = $("#ch-tabs");
  tabs.replaceChildren();
  for (const ch of CHANNELS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `ch-tab${ch === activeCh ? " on" : ""}`;
    b.textContent = `${ch}채널`;
    b.onclick = () => switchChannel(ch);
    tabs.appendChild(b);
  }
}

function switchChannel(ch) {
  if (ch === activeCh) return;
  activeCh = ch;
  try { sessionStorage.setItem("vr-teacher-ch", ch); } catch {}
  net = conns[ch] ?? null;
  buildChannelTabs();
  $("#join-url").textContent = `${location.origin}/?ch=${ch}`;
  last = dashByCh[ch] ?? null;
  if (last) { renderTeams(last.teams); renderKpis(last); renderDash(last); }
  else { $("#team-bar").hidden = true; $("#kpi-row").hidden = true; $("#roster").replaceChildren(); $("#problems").replaceChildren(); }
  renderOverview();
}

// ---------- 상단 KPI 카드: 접속 인원 · 팀 점수 게이지 · 평균 점수·정답률 · 탐험 상태 ----------
function renderKpis(d) {
  const row = $("#kpi-row");
  row.hidden = false;
  const online = d.students.filter((s) => s.online).length;
  const total = d.students.length;
  const avg = total ? Math.round(d.students.reduce((s, x) => s + x.score, 0) / total) : 0;
  let tried = 0, solved = 0;
  for (const p of PROBLEMS) { tried += d.stats[p.id]?.tried ?? 0; solved += d.stats[p.id]?.solved ?? 0; }
  const acc = tried ? Math.round((solved / tried) * 100) : null;
  $("#kpi-people").innerHTML = `<span class="kpi-icon">👥</span><b>${online}<small>/${total}</small></b><small>접속 중 / 총 학생</small>`;
  const v = d.visitors ?? { today: Math.max(total, 1), total: Math.max(total, 1), active: online };
  const kv = $("#kpi-visitors");
  if (kv) kv.innerHTML = `<span class="kpi-icon">👁️</span><b>${v.today}<small>명</small></b><small>오늘 방문 (누적 ${v.total}명 · 접속 ${v.active}명)</small>`;
  $("#kpi-avg").innerHTML = `<span class="kpi-icon">📊</span><b>${avg}<small>점</small></b><small>평균 점수 · 정답률 ${acc === null ? "–" : `${acc}%`}</small>`;
  $("#kpi-stage").innerHTML = `<span class="kpi-icon">🧭</span><b>${STAGE_TEXT[d.stage] ?? "–"}</b><small>${activeCh}채널 탐험 상태</small>`;
  const teams = d.teams ?? [];
  const top = Math.max(1, ...teams.map((t) => t.score));
  const tb = $("#kpi-teams");
  tb.innerHTML = `<span class="kpi-icon">🚩</span><div class="kpi-team-bars">${
    ["A", "B", "C", "D"].map((k) => {
      const t = teams.find((x) => x.team === k);
      const score = t?.score ?? 0;
      return `<div class="kpi-team-row"><span class="team-dot" style="background:${TEAM_COLORS[k]}"></span><i class="kpi-bar"><b style="width:${Math.round((score / top) * 100)}%;background:${TEAM_COLORS[k]}"></b></i><em>${score}</em></div>`;
    }).join("")
  }</div><small>팀별 실시간 점수</small>`;
}

// 5개 채널의 활성 학생 수와 진행 상태를 한눈에 둘러보는 미니 대시보드
function renderOverview() {
  const box = $("#ch-overview");
  if (!box) return;
  box.replaceChildren();
  for (const ch of CHANNELS) {
    const d = dashByCh[ch];
    const card = document.createElement("button");
    card.type = "button";
    card.className = `ch-card${ch === activeCh ? " on" : ""}`;
    const top = d?.teams?.[0];
    card.innerHTML = `<b>${ch}채널${ch === activeCh ? " · 보는 중" : ""}</b>
      <small>${STAGE_TEXT[d?.stage] ?? "–"} · 접속 ${d?.students?.filter((s) => s.online).length ?? 0}명</small>
      <small>${top ? `🥇 ${top.name} ${top.score}점` : "기록 없음"}</small>`;
    card.onclick = () => switchChannel(ch);
    box.appendChild(card);
  }
}

function cell(tag, text, className) {
  const c = document.createElement(tag);
  c.textContent = text;
  if (className) c.className = className;
  return c;
}

function probMark(p) {
  const hint = p?.hinted ? "💡" : "";
  if (!p || !p.tries) return [hint || "–", "none"];
  if (p.solved) return p.firstTry ? ["★", "first"] : [`✓${hint}`, "ok"];
  return [`✗${p.tries}${hint}`, "bad"];
}

// 문제 카드: 문제·정답은 한 번만 그리고(수식 조판), 숫자만 매번 고친다.
function buildProblems() {
  const box = $("#problems");
  box.replaceChildren();
  PROBLEMS.forEach((p, i) => {
    const card = document.createElement("article");
    card.className = "pcard";
    card.dataset.pid = p.id;
    card.innerHTML = `
      <header><span class="p-icon">${p.icon}</span><div><b>${i + 1}. ${p.relic}</b><small>${p.level} · 교과서 ${p.source}</small></div></header>
      <p class="ptext">${fmt(p.text)}</p>
      <p class="pans">정답: ${fmt(answers?.[p.id] ?? "–")}</p>
      <div class="pgauge" title="정답률"><i></i><span class="pgauge-label"></span></div>
      <dl class="pstats"></dl>
      <p class="pwrong"></p>`;
    box.appendChild(card);
  });
}

// 문제·정답 일람표: 7개 문제의 지문과 정답을 한눈에 보는 뷰. 정답표를 받은 뒤 한 번만 그린다.
function buildAnswerSheet() {
  const body = $("#answer-sheet");
  if (!answers) return;
  const table = document.createElement("table");
  table.className = "table answer-sheet-table";
  const head = document.createElement("tr");
  for (const h of ["번호", "문제 지문", "정답"]) head.appendChild(cell("th", h));
  table.appendChild(head);
  PROBLEMS.forEach((p, i) => {
    const tr = document.createElement("tr");
    const no = cell("td", `${i + 1}. ${p.icon} ${p.relic}`, "as-no");
    const text = document.createElement("td");
    text.className = "as-text";
    text.innerHTML = fmt(p.text); // 수식은 MathJax로 조판 (watchMath가 처리)
    const ans = document.createElement("td");
    ans.className = "as-answer";
    ans.innerHTML = fmt(answers[p.id] ?? "–");
    tr.append(no, text, ans);
    table.appendChild(tr);
  });
  body.replaceChildren(table);
}

// 팀 랭킹 카드: 학생 화면의 팀 랭킹을 교사 화면에도 그대로 보여 준다.
function renderTeams(teams) {
  const box = $("#team-bar");
  box.replaceChildren();
  if (!teams?.length) { box.hidden = true; return; }
  box.hidden = false;
  const top = Math.max(1, ...teams.map((t) => t.score));
  for (const t of teams) {
    const card = document.createElement("div");
    card.className = "team-card";
    card.style.setProperty("--team", TEAM_COLORS[t.team] ?? "#94a3b8");
    card.innerHTML = `<span class="team-badge">${t.team}</span>
      <div><b>${t.name}</b><small>${t.members}명 · 맞힌 문제 ${t.solved}개${t.escaped ? " · 🏁 탈출" : ""}</small></div>
      <b class="team-score">${t.score}점</b>
      <i class="team-gbar" style="width:${Math.round((t.score / top) * 100)}%"></i>`;
    box.appendChild(card);
  }
}

const TEAM_COLORS = { A: "#ef4444", B: "#3b82f6", C: "#22c55e", D: "#a855f7" };

function renderDash(d) {
  if (!$("#problems").childElementCount) buildProblems();
  PROBLEMS.forEach((p) => {
    const s = d.stats[p.id];
    const card = $(`.pcard[data-pid="${p.id}"]`);
    const rate = s.tried ? Math.round((s.solved / s.tried) * 100) : null;
    // 문제별 정답률 게이지
    const gauge = card.querySelector(".pgauge");
    gauge.querySelector("i").style.width = `${rate ?? 0}%`;
    gauge.querySelector(".pgauge-label").textContent = rate === null ? "아직 응답 없음" : `정답률 ${rate}% (${s.solved}/${s.tried})`;
    gauge.classList.toggle("low", rate !== null && rate < 50);
    const dl = card.querySelector(".pstats");
    dl.replaceChildren();
    for (const [k, v, warn] of [["도전", `${s.tried}명`], ["정답", `${s.solved}명`], ["첫 시도", rate === null ? "–" : `${Math.round((s.first / s.tried) * 100)}%`, rate !== null && rate < 50]]) {
      const dt = cell("dt", k);
      const dd = cell("dd", v, warn ? "warn-cell" : "");
      dl.append(dt, dd);
    }
    // 빈출 오답: 많이 나온 오답부터 작은 칩으로 표시
    const wrong = card.querySelector(".pwrong");
    wrong.innerHTML = s.topWrong.length
      ? `<span class="wrong-title">자주 나온 오답</span>${s.topWrong.map(([w, n]) => `<span class="wrong-chip">${fmt(w)}<b>${n}명</b></span>`).join("")}`
      : "";
  });

  const roster = $("#roster");
  roster.replaceChildren();
  const rh = document.createElement("tr");
  for (const h of ["순위", "이름", "팀", "점수", "맞힌 문제", "오답", "접속", "들어온 시각", "탈출 시각", "위치", "벡터 점프", "활동", "관리"]) rh.appendChild(cell("th", h));
  PROBLEMS.forEach((p, i) => {
    const th = cell("th", `${i + 1}`);
    th.title = `${i + 1}. ${p.relic}`;
    rh.appendChild(th);
  });
  roster.appendChild(rh);
  if (!d.students.length) {
    const tr = document.createElement("tr");
    const td = cell("td", "아직 수업에 참여한 학생이 없어요. 학생들에게 접속 주소를 알려 주세요.", "empty");
    td.colSpan = 13 + PROBLEMS.length;
    tr.appendChild(td);
    roster.appendChild(tr);
  }
  for (const st of d.students) {
    const solvedIdx = PROBLEMS.map((p, i) => (st.probs[p.id]?.solved ? i + 1 : null)).filter(Boolean);
    const tr = document.createElement("tr");
    tr.appendChild(cell("td", ["🥇", "🥈", "🥉"][st.rank - 1] ?? String(st.rank)));
    const nameTd = cell("td", "", "name");
    const nameBtn = cell("button", `${expanded.has(st.cid) ? "▾" : "▸"} ${st.name}`, "name-btn");
    nameBtn.type = "button";
    if (st.team) {
      const dot = document.createElement("span");
      dot.className = "team-dot";
      dot.title = `${st.team}팀`;
      dot.style.background = TEAM_COLORS[st.team] ?? "#94a3b8";
      nameTd.appendChild(dot);
    }
    nameTd.appendChild(nameBtn);
    nameBtn.onclick = () => { expanded.has(st.cid) ? expanded.delete(st.cid) : expanded.add(st.cid); renderDash(last); };
    nameTd.appendChild(nameBtn);
    tr.appendChild(nameTd);
    tr.appendChild(cell("td", st.team ? `${st.team}팀` : "–"));
    tr.appendChild(cell("td", `${st.score}점`));
    tr.appendChild(cell("td", `${solvedIdx.length}/${PROBLEMS.length}`));
    const wrongTries = Object.values(st.probs).reduce((n, p) => n + (p.tries ?? 0), 0) - Object.values(st.probs).filter((p) => p.solved).length;
    tr.appendChild(cell("td", `${Math.max(0, wrongTries)}번`, wrongTries >= 5 ? "mark bad" : ""));
    tr.appendChild(cell("td", st.online ? "🟢" : "⚪"));
    tr.appendChild(cell("td", clock(st.joinedAt)));
    tr.appendChild(cell("td", st.escapedAt ? `🏁 ${clock(st.escapedAt)}` : "–"));
    tr.appendChild(cell("td", st.room === null ? "–" : ROOMS[st.room].name));
    tr.appendChild(cell("td", `${st.lab}/${d.labLevels}`));
    tr.appendChild(cell("td", `🏃 ${st.mileage ?? 0}`));
    for (const p of PROBLEMS) {
      const [mark, cls] = probMark(st.probs[p.id]);
      tr.appendChild(cell("td", mark, `mark ${cls}`));
    }
    // 교사용 강퇴: 누르면 확인 뒤 그 학생을 유적에서 내보낸다
    const kickTd = cell("td", "", "kick-cell");
    const kickBtn = cell("button", "강퇴", "btn danger kick-btn");
    kickBtn.type = "button";
    kickBtn.onclick = () => {
      if (confirm(`${st.name} 학생을 유적에서 내보낼까요?`)) net?.send({ type: "kick", n: st.n });
    };
    kickTd.appendChild(kickBtn);
    tr.appendChild(kickTd);
    roster.appendChild(tr);
    if (expanded.has(st.cid)) roster.appendChild(detailRow(st, 13 + PROBLEMS.length));
  }
}

// 학생 한 명이 문제마다 어떻게 했는지 펼쳐 보기
function detailRow(st, span) {
  const tr = document.createElement("tr");
  tr.className = "detail";
  const td = document.createElement("td");
  td.colSpan = span;
  const ul = document.createElement("ul");
  PROBLEMS.forEach((p, i) => {
    const r = st.probs[p.id];
    let text;
    if (!r || !r.tries) text = r?.hinted ? "힌트만 봄" : "아직 안 풂";
    else if (r.solved) text = r.firstTry ? "★ 한 번에 정답" : `✓ ${r.tries}번 만에 정답`;
    else text = `✗ ${r.tries}번 시도, 아직 못 맞힘`;
    if (r?.hinted && r?.tries) text += " · 💡 힌트 봄";
    if (r?.wrongs?.length) text += ` · 낸 오답: ${r.wrongs.join(", ")}`;
    const li = document.createElement("li");
    li.textContent = `${p.icon} ${i + 1}. ${p.relic} — ${text}`;
    ul.appendChild(li);
  });
  td.appendChild(ul);
  tr.appendChild(td);
  return tr;
}

function clock(ms) {
  return ms ? new Date(ms).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "–";
}

function downloadCsv(d) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ["순위", "이름", "팀", "점수", "들어온 시각", "탈출 시각", "벡터 점프", "활동 마일리지", "개념 학습", ...PROBLEMS.map((p, i) => `${i + 1}.${p.relic}`), ...PROBLEMS.map((p, i) => `${i + 1}.오답`)];;;
  const rows = d.students.map((st) => {
    const marks = PROBLEMS.map((p) => {
      const r = st.probs[p.id];
      const hint = r?.hinted ? ", 힌트" : "";
      if (!r || !r.tries) return r?.hinted ? "미응시(힌트 봄)" : "미응시";
      return r.solved ? `정답(${r.tries}회${hint})` : `오답(${r.tries}회${hint})`;
    });
    const wrongs = PROBLEMS.map((p) => (st.probs[p.id]?.wrongs ?? []).join(" / "));
    return [st.rank, st.name, st.team ?? "", st.score, clock(st.joinedAt), st.escapedAt ? clock(st.escapedAt) : "", `${st.lab}/${d.labLevels}`, st.mileage ?? 0, st.concepts ?? 0, ...marks, ...wrongs];
  });
  const csv = "﻿" + [head, ...rows].map((r) => r.map(q).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `벡터유적탈출_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
