import { connect } from "./net.js";
import { fmt, watchMath } from "./mathtext.js";
import { PROBLEMS } from "./problems.js";
import { renderClassBar } from "./classbar.js";
import { ROOMS } from "./game.js";

const $ = (s) => document.querySelector(s);
let net = null, last = null, answers = null;
const expanded = new Set(); // 펼쳐 본 학생
const STAGE_NAME = { lobby: "⏸ 대기 중", play: "▶ 탐험 중", done: "■ 탐험 끝" };
watchMath();

// 비밀번호는 이 탭을 닫으면 잊는다.
const remember = (pw) => { try { pw === null ? sessionStorage.removeItem("vr-teacher") : sessionStorage.setItem("vr-teacher", pw); } catch {} };
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

function start(password) {
  net?.close();
  $("#setup-error").textContent = "";
  $("#join-url").textContent = `${location.origin}/`;
  net = connect(() => ({ type: "hello", role: "teacher", password }), (msg) => {
    if (msg.type === "joined") {
      remember(password);
      answers = msg.answers ?? null;
      $("#problems").replaceChildren(); // 정답을 받았으니 문제 카드를 새로 그린다
      $("#setup").hidden = true;
      $("#dash").hidden = false;
    }
    onMessage(msg);
  }, onStatus);
}

function onStatus(kind, code) {
  $("#conn-chip").textContent = kind === "open" ? "🟢 연결됨" : kind === "retry" ? "🟡 다시 연결 중" : "🔴 연결 끊김";
  if (kind === "final") {
    $("#dash").hidden = true;
    $("#setup").hidden = false;
    if (code === 4003) remember(null); // 비밀번호가 틀리면 잊고 다시 묻는다
    if (code === 4000) $("#setup-error").textContent = "지난 수업 기록이 정리되었어요. 다시 들어와 주세요.";
  }
}

function onMessage(msg) {
  if (msg.type === "dashboard") {
    last = msg;
    $("#stage-chip").textContent = STAGE_NAME[msg.stage] ?? "";
    renderDash(msg);
  } else if (msg.type === "class") {
    renderClassBar($("#class-bar"), msg, { showEnergy: true, showShelf: true });
  } else if (msg.type === "error") {
    $("#setup-error").textContent = msg.message;
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
      <dl class="pstats"></dl>
      <p class="pwrong"></p>`;
    box.appendChild(card);
  });
}

function renderDash(d) {
  if (!$("#problems").childElementCount) buildProblems();
  PROBLEMS.forEach((p) => {
    const s = d.stats[p.id];
    const card = $(`.pcard[data-pid="${p.id}"]`);
    const rate = s.tried ? Math.round((s.first / s.tried) * 100) : null;
    const dl = card.querySelector(".pstats");
    dl.replaceChildren();
    for (const [k, v, warn] of [["도전", `${s.tried}명`], ["정답", `${s.solved}명`], ["첫 시도 정답률", rate === null ? "–" : `${rate}%`, rate !== null && rate < 50]]) {
      const dt = cell("dt", k);
      const dd = cell("dd", v, warn ? "warn-cell" : "");
      dl.append(dt, dd);
    }
    card.querySelector(".pwrong").textContent = s.topWrong.length ? `자주 나온 오답: ${s.topWrong.map(([w, n]) => `${w} (${n}명)`).join(", ")}` : "";
  });

  const roster = $("#roster");
  roster.replaceChildren();
  const rh = document.createElement("tr");
  for (const h of ["순위", "이름", "점수", "맞힌 문제", "접속", "들어온 시각", "탈출 시각", "위치", "벡터 점프"]) rh.appendChild(cell("th", h));
  PROBLEMS.forEach((p, i) => {
    const th = cell("th", `${i + 1}`);
    th.title = `${i + 1}. ${p.relic}`;
    rh.appendChild(th);
  });
  roster.appendChild(rh);
  if (!d.students.length) {
    const tr = document.createElement("tr");
    const td = cell("td", "아직 수업에 참여한 학생이 없어요. 학생들에게 접속 주소를 알려 주세요.", "empty");
    td.colSpan = 9 + PROBLEMS.length;
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
    nameBtn.onclick = () => { expanded.has(st.cid) ? expanded.delete(st.cid) : expanded.add(st.cid); renderDash(last); };
    nameTd.appendChild(nameBtn);
    tr.appendChild(nameTd);
    tr.appendChild(cell("td", `${st.score}점`));
    tr.appendChild(cell("td", `${solvedIdx.length}/${PROBLEMS.length}`));
    tr.appendChild(cell("td", st.online ? "🟢" : "⚪"));
    tr.appendChild(cell("td", clock(st.joinedAt)));
    tr.appendChild(cell("td", st.escapedAt ? `🏁 ${clock(st.escapedAt)}` : "–"));
    tr.appendChild(cell("td", st.room === null ? "–" : ROOMS[st.room].name));
    tr.appendChild(cell("td", `${st.lab}/${d.labLevels}`));
    for (const p of PROBLEMS) {
      const [mark, cls] = probMark(st.probs[p.id]);
      tr.appendChild(cell("td", mark, `mark ${cls}`));
    }
    roster.appendChild(tr);
    if (expanded.has(st.cid)) roster.appendChild(detailRow(st, 9 + PROBLEMS.length));
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
  const head = ["순위", "이름", "점수", "들어온 시각", "탈출 시각", "벡터 점프", ...PROBLEMS.map((p, i) => `${i + 1}.${p.relic}`), ...PROBLEMS.map((p, i) => `${i + 1}.오답`)];
  const rows = d.students.map((st) => {
    const marks = PROBLEMS.map((p) => {
      const r = st.probs[p.id];
      const hint = r?.hinted ? ", 힌트" : "";
      if (!r || !r.tries) return r?.hinted ? "미응시(힌트 봄)" : "미응시";
      return r.solved ? `정답(${r.tries}회${hint})` : `오답(${r.tries}회${hint})`;
    });
    const wrongs = PROBLEMS.map((p) => (st.probs[p.id]?.wrongs ?? []).join(" / "));
    return [st.rank, st.name, st.score, clock(st.joinedAt), st.escapedAt ? clock(st.escapedAt) : "", `${st.lab}/${d.labLevels}`, ...marks, ...wrongs];
  });
  const csv = "﻿" + [head, ...rows].map((r) => r.map(q).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `벡터유적탈출_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
