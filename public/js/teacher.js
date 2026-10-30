import { connect } from "./net.js";
import { PROBLEMS } from "./problems.js";
import { renderClassBar } from "./classbar.js";
import { ROOMS } from "./game.js";

const $ = (s) => document.querySelector(s);
let net = null, last = null;

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

document.querySelectorAll("[data-stage]").forEach((b) => {
  b.onclick = () => net?.send({ type: "stage", stage: b.dataset.stage });
});

$("#csv").onclick = () => { if (last) downloadCsv(last); };

function start(password) {
  net?.close();
  $("#setup-error").textContent = "";
  $("#join-url").textContent = `${location.origin}/`;
  net = connect(() => ({ type: "hello", role: "teacher", password }), (msg) => {
    if (msg.type === "joined") {
      remember(password);
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

function renderDash(d) {
  document.querySelectorAll("[data-stage]").forEach((b) => b.classList.toggle("primary", b.dataset.stage === d.stage));

  const stats = $("#stats");
  stats.replaceChildren();
  const sh = document.createElement("tr");
  for (const h of ["유물", "난이도", "시도", "정답", "첫 시도 정답률", "자주 나온 오답"]) sh.appendChild(cell("th", h));
  stats.appendChild(sh);
  PROBLEMS.forEach((p, i) => {
    const s = d.stats[p.id];
    const tr = document.createElement("tr");
    tr.appendChild(cell("td", `${p.icon} ${i + 1}. ${p.relic}`));
    tr.appendChild(cell("td", p.level));
    tr.appendChild(cell("td", `${s.tried}명`));
    tr.appendChild(cell("td", `${s.solved}명`));
    const rate = s.tried ? Math.round((s.first / s.tried) * 100) : null;
    tr.appendChild(cell("td", rate === null ? "–" : `${rate}%`, rate !== null && rate < 50 ? "warn-cell" : ""));
    tr.appendChild(cell("td", s.topWrong.map(([w, n]) => `${w} (${n})`).join(", ") || "–", "wrongs"));
    stats.appendChild(tr);
  });

  const roster = $("#roster");
  roster.replaceChildren();
  const rh = document.createElement("tr");
  rh.appendChild(cell("th", "순위"));
  rh.appendChild(cell("th", "이름"));
  rh.appendChild(cell("th", "점수"));
  rh.appendChild(cell("th", "접속"));
  rh.appendChild(cell("th", "들어온 시각"));
  rh.appendChild(cell("th", "탈출 시각"));
  rh.appendChild(cell("th", "위치"));
  rh.appendChild(cell("th", "벡터 점프"));
  PROBLEMS.forEach((p, i) => rh.appendChild(cell("th", `${p.icon}${i + 1}`)));
  roster.appendChild(rh);
  if (!d.students.length) {
    const tr = document.createElement("tr");
    const td = cell("td", "아직 들어온 학생이 없어요. 학생들에게 접속 주소를 알려 주세요.", "empty");
    td.colSpan = 8 + PROBLEMS.length;
    tr.appendChild(td);
    roster.appendChild(tr);
  }
  for (const st of d.students) {
    const tr = document.createElement("tr");
    tr.appendChild(cell("td", ["🥇", "🥈", "🥉"][st.rank - 1] ?? String(st.rank)));
    tr.appendChild(cell("td", st.name, "name"));
    tr.appendChild(cell("td", `${st.score}점`));
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
  }
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
