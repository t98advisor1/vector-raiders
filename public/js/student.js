import { connect, store } from "./net.js";
import { fmt, watchMath } from "./mathtext.js";
import { LAB_LEVELS } from "./lab.js";
import { PROBLEMS } from "./problems.js";
import { renderClassBar } from "./classbar.js";
import { Game, ROOMS, DOORS, BRIDGES, OBJECTS, roomAt } from "./game.js";
import { World3D } from "./world3d.js";
import { sound } from "./sound.js";
import { createIntro } from "./intro.js";
import { settings, updateSettings, onSettings } from "./settings.js";

const $ = (s, root = document) => root.querySelector(s);
const STAGE_NAME = { lobby: "대기 중", play: "탐험 중", done: "탐험 끝" };
const CLOSE_REASON = {
  4000: "지난 수업 기록이 정리되었어요. 다시 들어와 주세요.",
  4001: "이름을 확인해 주세요.",
  4002: "유적 인원이 가득 찼어요. 선생님께 알려 주세요.",
  4005: "다른 창에서 같은 이름으로 들어와서 이 창의 연결을 끊었어요.",
  4006: "선생님이 새 수업을 시작했어요. 이름을 확인하고 다시 들어와 주세요.",
};

let cid = store("vr-cid");
if (typeof cid !== "string" || !/^[a-z0-9]{8,32}$/.test(cid)) {
  cid = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => (b % 36).toString(36)).join("");
  store("vr-cid", cid);
}

const S = { net: null, name: null, me: null, cls: null, game: null, world: null, modal: null, waiting: false };
if (["127.0.0.1", "localhost"].includes(location.hostname)) window.__vr = S; // 이 컴퓨터에서 개발할 때만 점검용으로 연다

const solved = (pid) => !!S.me?.probs[pid]?.solved;
const labDone = (lab) => !!S.me?.lab.includes(lab);
const doorOpen = (id) => DOORS[id].every(solved);
const altarLit = () => !!S.cls && PROBLEMS.every((p) => S.cls.relics[p.id]?.unlocked);

// ---------- 입장 ----------
watchMath();

// 첫 화면: TOUCH TO START → 카드 메뉴(연습 모드 / 수업 참가 / 설정) → 이름 적기
const intro = createIntro({ rain: $("#rain"), stage: $("#stage") });
intro.play();
intro.cardArt().then((art) => {
  if (!art) return;
  $("#art-practice").src = art.practice;
  $("#art-class").src = art.class;
});

function showScreen(which) {
  $("#splash").hidden = which !== "splash";
  $("#menu").hidden = which === "splash";
  $("#join-form").hidden = which !== "name";
  $("#settings-sheet").hidden = which !== "settings";
  intro.showRunners(which === "splash");
}

const touch = () => {
  if ($("#splash").hidden) return;
  sound.start(); // 첫 화면을 누른 지금이 소리를 켤 수 있는 때
  sound.sfx("start");
  showScreen("menu");
};
$("#touch").onclick = touch;
window.addEventListener("keydown", (e) => { if (!$("#join").hidden && (e.key === "Enter" || e.key === " ")) touch(); });

const SHEET = {
  practice: ["🎯 연습 모드", "혼자 언제든 탐험해요. 기록은 나만 보고, 언제든 처음부터 다시 할 수 있어요."],
  class: ["🏫 수업 참가", "반 친구들과 같은 유적에 들어가요. 선생님이 탐험을 시작하면 상자가 열려요."],
};
document.querySelectorAll(".mcard[data-mode]").forEach((b) => {
  b.onclick = () => {
    S.pendingMode = b.dataset.mode;
    const [title, lead] = SHEET[S.pendingMode];
    $("#sheet-title").textContent = title;
    $("#sheet-lead").textContent = lead;
    $("#start-btn").hidden = S.pendingMode !== "class";
    sound.sfx("open");
    showScreen("name");
    $("#join-name").focus();
  };
});
$("#sheet-back").onclick = () => showScreen("menu");
$("#open-settings").onclick = () => { sound.sfx("open"); showScreen("settings"); };
$("#settings-close").onclick = () => showScreen("menu");

const SETTING_TEXT = { music: ["켜짐", "꺼짐"], sfx: ["켜짐", "꺼짐"], quality: ["높음", "낮음"] };
document.querySelectorAll(".toggle[data-key]").forEach((b) => {
  b.onclick = () => {
    const k = b.dataset.key;
    updateSettings({ [k]: k === "quality" ? (settings.quality === "high" ? "low" : "high") : !settings[k] });
  };
});
onSettings(() => {
  document.querySelectorAll(".toggle[data-key]").forEach((b) => {
    const k = b.dataset.key;
    const on = k === "quality" ? settings.quality === "high" : settings[k];
    b.textContent = SETTING_TEXT[k][on ? 0 : 1];
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  });
});

const session = store("vr-session");
$("#join-name").value = session?.name ?? "";
$("#join-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#join-name").value.trim();
  if (!name) return showJoinError("이름을 입력해 주세요.");
  sound.start();
  join(name, S.pendingMode === "practice" ? "practice" : "class");
});
// 새로고침 뒤 자동으로 다시 들어온 경우처럼 버튼을 누르지 않았을 때는 첫 조작에서 소리를 켠다.
for (const ev of ["pointerdown", "keydown"]) window.addEventListener(ev, () => sound.start(), { once: true });

function showJoinError(text) { $("#join-error").textContent = text; }

// mode: "practice"(혼자 연습, 내 유적) 또는 "class"(수업 참여, 반 전체 유적)
function join(name, mode) {
  S.net?.close();
  S.name = name;
  S.mode = mode;
  showJoinError("");
  const query = mode === "practice" ? `?mode=practice&cid=${cid}` : "";
  S.net = connect(() => ({ type: "hello", role: "student", cid, name: S.name }), onMessage, onStatus, query);
}

// 연습 모드 '처음부터 다시' 뒤에는 새로고침하고 자동으로 다시 들어온다.
const autojoin = (() => { try { const v = sessionStorage.getItem("vr-autojoin"); sessionStorage.removeItem("vr-autojoin"); return v; } catch { return null; } })();
if (autojoin === "practice" && session?.name) { showScreen("menu"); join(session.name, "practice"); }

// 학생 화면의 '선생님: 수업 탐험 시작'. 시작 비밀번호가 맞으면 수업 유적의 탐험이 시작된다.
function askStart() {
  const code = prompt("수업 탐험을 시작할 선생님 비밀번호를 입력하세요.");
  if (!code) return;
  if (S.net && S.mode === "class") return S.net.send({ type: "start", code: code.trim() });
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onopen = () => ws.send(JSON.stringify({ type: "start", code: code.trim() }));
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "started") showJoinError("✅ 수업 탐험을 시작했어요! 학생들은 '수업 참가'로 들어오면 돼요.");
    else if (msg.type === "error") showJoinError(msg.message);
    ws.close();
  };
}
$("#start-btn").onclick = askStart;

function onStatus(kind, code) {
  $("#conn").hidden = kind !== "retry";
  if (kind === "final") {
    closeModal();
    $("#game").hidden = true;
    $("#join").hidden = false;
    intro.play();
    showScreen("menu");
    showJoinError(CLOSE_REASON[code] ?? "연결이 끊겼어요. 다시 입장해 주세요.");
  }
}

function onMessage(msg) {
  if (msg.type === "joined") {
    store("vr-session", { name: msg.name });
    $("#join").hidden = true;
    intro.pause(); // 첫 화면 연출을 멈춰 크롬북 자원을 게임에 돌린다
    $("#game").hidden = false;
    $("#me-chip").textContent = `👤 ${msg.name}`;
    $("#mode-chip").textContent = S.mode === "practice" ? "🎯 혼자 연습" : "🏫 수업 참여";
    $("#restart-btn").hidden = S.mode !== "practice";
    if (!S.game) startWorld();
    S.game.setMe(msg.n, msg.name);
    if (msg.pos) { S.game.me.x = msg.pos.x; S.game.me.y = msg.pos.y; } // 새로고침해도 하던 자리에서
    S.game.forceSend();
    $("#world").focus();
  } else if (msg.type === "me") {
    const before = S.me;
    S.me = msg.me;
    announceProgress(before, S.me);
    updateHud();
  } else if (msg.type === "class") {
    const before = S.cls;
    S.cls = msg;
    S.game?.setRoster(msg.players ?? []);
    announceRelics(before, msg);
    if (!before || before.stage !== msg.stage) onStage(msg.stage);
    updateHud();
  } else if (msg.type === "pos") {
    S.game?.setOthers(msg.list);
  } else if (msg.type === "result") {
    onResult(msg);
  } else if (msg.type === "started") {
    toast("🔑 수업 탐험을 시작했어요!", "ok");
  } else if (msg.type === "restarted") {
    try { sessionStorage.setItem("vr-autojoin", "practice"); } catch {}
    location.reload();
  } else if (msg.type === "found") {
    if (msg.n !== S.game?.me.n) showFound(msg); // 내 발견은 문제 창에서 이미 축하한다
  } else if (msg.type === "error") {
    if ($("#game").hidden) showJoinError(msg.message);
    else toast(msg.message);
  }
}

const hooks = {
  isDoorOpen: doorOpen,
  isLabDone: labDone,
  isSolved: solved,
  relics: () => PROBLEMS.map((p) => !!S.cls?.relics[p.id]?.unlocked),
  hasState: () => !!S.me && !!S.cls,
  paused: () => !!S.modal,
  onMove: (x, y, room) => S.net?.send({ type: "pos", x, y, room }) ?? false,
  onInteract,
};

function startWorld() {
  S.game = new Game(hooks);
  const loading = $("#loading");
  loading.hidden = false;
  try {
    S.world = new World3D($("#world"), S.game, hooks);
  } catch {
    loading.textContent = "이 기기에서는 3D 화면을 켤 수 없어요. 크롬 브라우저 최신 버전에서 다시 열어 주세요.";
    return;
  }
  S.world.init()
    .then(() => { S.world.start(); loading.hidden = true; })
    .catch(() => { loading.textContent = "유적을 불러오지 못했어요. 새로고침해 주세요."; });
}

// ---------- 화면 위 표시 ----------
function toast(text, kind = "") {
  const t = document.createElement("div");
  t.className = `toast ${kind}`;
  t.innerHTML = fmt(text);
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("out"), 2600);
  setTimeout(() => t.remove(), 3200);
}

function updateHud() {
  if (!S.game) return;
  const room = roomAt(S.game.me.x);
  $("#hud-room").textContent = ROOMS[room].name;
  sound.setIntensity(room); // 다음 방으로 갈수록 음악이 고조된다
  const keys = PROBLEMS.filter((p) => solved(p.id)).length;
  $("#hud-keys").textContent = `🗝️ ${keys}/${PROBLEMS.length}`;
  $("#hud-jumps").textContent = `✨ ${S.me?.lab.length ?? 0}/${LAB_LEVELS.length}`;
  const relics = $("#hud-relics");
  relics.replaceChildren();
  for (const p of PROBLEMS) {
    const s = document.createElement("span");
    s.textContent = p.icon;
    s.className = S.cls?.relics[p.id]?.unlocked ? "on" : "";
    s.title = `${p.relic} ${S.cls?.relics[p.id]?.solved ?? 0}/${S.cls?.relics[p.id]?.need ?? "?"}`;
    relics.appendChild(s);
  }
  if (S.cls) {
    $("#stage-chip").textContent = STAGE_NAME[S.cls.stage] ?? "";
    $("#online-chip").textContent = `👥 ${S.cls.online}명 접속`;
    renderRanking();
  }
}
setInterval(updateHud, 500); // 방 이름은 움직일 때 바뀐다

// 실시간 랭킹: 상위 5명과, 5등 밖이면 내 순위도 함께
function renderRanking() {
  if (S.mode === "practice") { $("#hud-rank").replaceChildren(); return; } // 혼자 연습할 때는 랭킹을 보이지 않는다
  const list = S.cls.ranking ?? [];
  const box = $("#hud-rank");
  const key = JSON.stringify(list.map((r) => [r.n, r.score, r.name]));
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  box.replaceChildren();
  if (!list.length) return;
  const title = document.createElement("li");
  title.className = "rank-title";
  title.textContent = "🏆 실시간 랭킹";
  box.appendChild(title);
  const mine = list.findIndex((r) => r.n === S.game?.me.n);
  const rows = list.slice(0, 5).map((r, i) => [i, r]);
  if (mine >= 5) rows.push(null, [mine, list[mine]]);
  for (const row of rows) {
    const li = document.createElement("li");
    if (!row) { li.className = "gap"; li.textContent = "⋯"; box.appendChild(li); continue; }
    const [i, r] = row;
    if (i === mine) li.className = "mine";
    const medal = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}`;
    for (const [cls, text] of [["pos", medal], ["nm", `${r.name}${r.escaped ? " 🏁" : ""}`], ["sc", `${r.score}점`]]) {
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = text;
      li.appendChild(s);
    }
    box.appendChild(li);
  }
}

// 누군가 유물 조각을 발견하면 모두에게 팝업. 한꺼번에 많이 오면 줄을 세워 하나씩 보여 준다.
const foundQueue = [];
let foundShowing = 0;
function showFound(msg) {
  const p = PROBLEMS.find((x) => x.id === msg.pid);
  if (!p) return;
  const same = foundQueue.find((q) => q.pid === msg.pid);
  if (same) same.names.push(msg.name); // 같은 유물을 여러 명이 연달아 찾으면 한 팝업으로 묶는다
  else foundQueue.push({ pid: msg.pid, names: [msg.name] });
  pumpFound();
}

function pumpFound() {
  while (foundShowing < 2 && foundQueue.length) {
    const { pid, names } = foundQueue.shift();
    const p = PROBLEMS.find((x) => x.id === pid);
    const who = names.length === 1 ? `${names[0]}님이` : `${names[0]}님 외 ${names.length - 1}명이`;
    const el = document.createElement("div");
    el.className = "popup";
    const icon = document.createElement("span");
    icon.className = "pi";
    icon.textContent = p.icon;
    const text = document.createElement("div");
    text.textContent = `🎉 ${who} ${p.relic} 조각을 발견했어요!`;
    const sub = document.createElement("small");
    sub.textContent = "제단에 유물 조각이 하나 더 모였어요";
    text.appendChild(sub);
    el.append(icon, text);
    $("#popups").appendChild(el);
    foundShowing++;
    sound.sfx("found");
    setTimeout(() => el.classList.add("out"), 2600);
    setTimeout(() => { el.remove(); foundShowing--; pumpFound(); }, 3000);
  }
}

function onStage(stage) {
  const banner = $("#banner");
  banner.hidden = stage === "play";
  if (stage === "lobby") {
    banner.textContent = "선생님이 탐험을 시작하면 상자를 열 수 있어요. 지금은 주변을 둘러보세요! ";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.textContent = "🔑 선생님: 탐험 시작";
    b.onclick = askStart;
    banner.appendChild(b);
  }
  if (stage === "play") { toast("탐험 시작! 상자를 열어 열쇠 조각을 모으세요.", "ok"); sound.sfx("start"); }
  if (stage === "done") { banner.textContent = "탐험이 끝났어요. 수고했어요!"; showSummary(); }
}

function announceProgress(before, now) {
  if (!before) return;
  for (const id of Object.keys(DOORS)) {
    const wasOpen = DOORS[id].every((p) => before.probs[p]?.solved);
    if (!wasOpen && doorOpen(id)) {
      toast(`🚪 ${ROOMS[Number(id) - 1].name}의 문이 열렸어요! 다음 방으로 가세요.`, "ok");
      sound.sfx("door");
    }
  }
  for (const lab of now.lab) {
    if (!before.lab.includes(lab)) {
      const br = Object.values(BRIDGES).find((b) => b.lab === lab);
      toast(`✨ ${br.title} 성공! 길이 생겼어요.`, "ok");
      sound.sfx("bridge");
    }
  }
}

function announceRelics(before, cls) {
  if (!before) return;
  for (const p of PROBLEMS) {
    if (cls.relics[p.id]?.unlocked && !before.relics[p.id]?.unlocked) {
      toast(`${p.icon} ${p.relic}이(가) 제단에서 깨어났어요! 우리 반 협동 성공!`, "ok");
      sound.sfx("relic");
    }
  }
  if (altarLit() && !PROBLEMS.every((p) => before.relics[p.id]?.unlocked)) toast("🏛️ 유물 7개가 모두 깨어났어요! 우리 반 유적 탈출 성공!", "ok");
}

// ---------- 창 ----------
function openModal(wide = true) {
  S.modal = true;
  S.game?.keys.clear();
  sound.setDuck(true); // 문제에 집중하도록 음악을 줄인다
  const modal = $("#modal");
  modal.hidden = false;
  $(".modal-panel", modal).classList.toggle("narrow", !wide);
  const body = $("#modal-body");
  body.replaceChildren();
  return body;
}

function closeModal() {
  S.modal = null;
  S.pid = null;
  $("#modal").hidden = true;
  sound.setDuck(false);
  $("#world")?.focus();
}

$("#modal-close").onclick = closeModal;
$("#modal").addEventListener("pointerdown", (e) => { if (e.target.id === "modal") closeModal(); });
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && S.modal) closeModal();
  const tag = e.target?.tagName;
  if (e.code === "KeyM" && tag !== "INPUT" && tag !== "TEXTAREA") sound.toggle();
});
$("#sound-btn").onclick = () => sound.toggle();
$("#restart-btn").onclick = () => {
  if (confirm("연습 기록을 모두 지우고 처음부터 다시 할까요?")) S.net.send({ type: "restart" });
};
sound.onChange((muted) => {
  $("#sound-btn").textContent = muted ? "🔇" : "🔊";
  $("#sound-btn").setAttribute("aria-label", muted ? "소리 켜기 (M)" : "소리 끄기 (M)");
});

function onInteract(target) {
  const stage = S.cls?.stage;
  if (target.kind === "door") {
    const need = DOORS[target.id];
    const left = need.filter((p) => !solved(p)).length;
    return toast(`🔒 잠겨 있어요. 이 방에서 열쇠 조각 ${left}개를 더 찾아야 해요.`);
  }
  if (target.kind === "altar") return showAltar();
  if (stage !== "play") return toast("선생님이 탐험을 시작하면 열 수 있어요.");
  if (target.kind === "object") return openProblem(target.id);
  if (target.kind === "bridge") return openBridge(target.bridge);
}

// 장애물: 벡터 실험실 한 단계
function openBridge(br) {
  const idx = LAB_LEVELS.findIndex((l) => l.id === br.lab);
  const lv = LAB_LEVELS[idx];
  const body = openModal();
  sound.sfx("open");
  body.innerHTML = `
    <div class="p-head"><span class="p-icon">✨</span>
      <div><h2>${br.title}: 벡터 점프</h2><small>벡터 실험 ${idx + 1} · ${lv.title}</small></div></div>
    <p class="goal">${fmt(lv.goal)}</p>
    <div class="board-wrap"></div>
    <div class="status"></div>
    <div class="ctrl"></div>
    <div class="next-row"><button class="btn primary next" type="button" hidden>건너가기 →</button></div>`;
  const next = $(".next", body);
  next.onclick = closeModal;
  lv.build({ board: $(".board-wrap", body), status: $(".status", body), ctrl: $(".ctrl", body) }, () => {
    S.net.send({ type: "lab", level: lv.id });
    next.hidden = false;
  });
}

// 상자: 문제
function openProblem(pid) {
  const p = PROBLEMS.find((x) => x.id === pid);
  const obj = OBJECTS.find((o) => o.pid === pid);
  const idx = PROBLEMS.indexOf(p);
  const body = openModal();
  sound.sfx("open");
  S.pid = pid;
  S.waiting = false;
  body.innerHTML = `
    <div class="p-head"><span class="p-icon">${obj.icon}</span>
      <div><h2>${obj.name}을(를) 열었더니… 문제 ${idx + 1}</h2><small>${p.level} · 교과서 ${p.source} · 맞히면 🗝️ 열쇠 조각과 ${p.icon} ${p.relic} 조각</small></div></div>
    <p class="p-text"></p>
    <div class="tool">
      <div class="tool-help">🔍 ${fmt(p.toolHelp)}</div>
      <div class="board-wrap"></div>
      <div class="tool-info"></div>
      <div class="tool-ctrl"></div>
    </div>
    <div class="answer"></div>
    <div class="feedback" role="status"></div>
    <div class="hint" hidden></div>`;
  p.tool({ board: $(".board-wrap", body), info: $(".tool-info", body), ctrl: $(".tool-ctrl", body), autoplay: true });
  typeText($(".p-text", body), p.text); // 모든 문제: 타자 소리와 함께 한 글자씩
  const mine = S.me?.probs[pid];
  if (mine?.solved) lockSolved(body);
  else {
    buildAnswer(p, $(".answer", body));
    if (mine?.tries >= 2 || mine?.hinted) showHint(body, p);
  }
}

// 문제 문장을 타자 소리와 함께 한 글자씩 찍는다. 수식은 한 덩어리로 나타난다.
// 문장을 누르면 바로 끝까지 보여 준다.
function typeText(el, src) {
  const tokens = String(src).match(/\$[^$]+\$|\[[A-Z]{1,3}\]|\{[a-z]\}|\^\d|[\s\S]/gu) ?? [];
  let i = 0, done = false;
  el.classList.add("typing");
  const finish = () => {
    if (done) return;
    done = true;
    el.innerHTML = fmt(src);
    el.classList.remove("typing");
  };
  el.addEventListener("click", finish, { once: true });
  const tick = () => {
    if (done || !el.isConnected) return;
    if (i >= tokens.length) return finish();
    const tok = tokens[i++];
    const math = tok.length > 1;
    if (math) {
      const span = document.createElement("span");
      span.innerHTML = fmt(tok);
      el.appendChild(span);
    } else {
      el.appendChild(document.createTextNode(tok));
    }
    if (tok.trim()) sound.sfx("type");
    setTimeout(tick, math ? 140 : /[,.]/.test(tok) ? 160 : 38);
  };
  setTimeout(tick, 300);
}

function buildAnswer(p, root) {
  const submit = document.createElement("button");
  submit.type = "button";
  submit.className = "btn primary";
  submit.textContent = "제출하기";
  // 학생이 스스로 여는 힌트. 본 기록은 교사 화면에 💡로 남는다.
  const hintBtn = document.createElement("button");
  hintBtn.type = "button";
  hintBtn.className = "btn ghost-btn hint-btn";
  hintBtn.textContent = "💡 힌트 보기";
  hintBtn.hidden = !!S.me?.probs[p.id]?.hinted;
  hintBtn.onclick = () => {
    if (!confirm("힌트를 볼까요? 힌트를 보고 맞히면 '한 번에 정답' 보너스는 받지 못해요.")) return;
    S.net.send({ type: "hint", pid: p.id });
    showHint(root.closest("#modal-body"), p);
    hintBtn.hidden = true;
  };
  queueMicrotask(() => root.append(hintBtn)); // 제출 버튼 뒤에 붙인다

  if (p.answer.kind === "multi") {
    const picked = new Set();
    const chips = document.createElement("div");
    chips.className = "chips";
    chips.innerHTML = `<span class="chips-label">보기</span>`;
    for (const o of p.answer.options) {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "chip-btn";
      c.innerHTML = fmt(`[${o}]`);
      c.setAttribute("aria-label", `벡터 ${o}`);
      c.setAttribute("aria-pressed", "false");
      c.onclick = () => {
        if (picked.has(o)) picked.delete(o); else picked.add(o);
        c.classList.toggle("on", picked.has(o));
        c.setAttribute("aria-pressed", String(picked.has(o)));
      };
      chips.appendChild(c);
    }
    submit.onclick = () => {
      if (!picked.size) return feedback("보기에서 하나 이상 골라 주세요.", "warn");
      send(p.id, [...picked]);
    };
    root.append(chips, submit);
    return;
  }

  const row = document.createElement("div");
  row.className = "expr";
  const label = document.createElement("label");
  label.textContent = p.answer.label;
  const input = document.createElement("input");
  Object.assign(input, { type: "text", maxLength: 40, placeholder: "예: 2√5, 1/2, π/2, −3", autocomplete: "off" });
  label.appendChild(input);
  const pad = document.createElement("div");
  pad.className = "keypad";
  for (const k of ["√", "π", "/", "−", "(", ")", "⌫"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = k;
    b.setAttribute("aria-label", k === "⌫" ? "지우기" : k);
    b.onclick = () => {
      input.value = k === "⌫" ? input.value.slice(0, -1) : input.value + k;
      input.focus();
    };
    pad.appendChild(b);
  }
  const go = () => {
    if (!input.value.trim()) return feedback("답을 입력해 주세요.", "warn");
    send(p.id, input.value.trim());
  };
  submit.onclick = go;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  row.append(label, pad);
  root.append(row, submit);
}

function send(pid, answer) {
  if (S.waiting) return;
  if (!S.net.send({ type: "submit", pid, answer })) return feedback("연결이 끊겼어요. 잠시 후 다시 제출해 주세요.", "warn");
  S.waiting = true;
  setTimeout(() => { S.waiting = false; }, 4000);
}

function feedback(text, kind) {
  const f = $("#modal-body .feedback");
  if (!f) return;
  f.className = `feedback ${kind}`;
  f.innerHTML = fmt(text);
}

function showHint(body, p) {
  const h = $(".hint", body);
  if (!h.hidden) return;
  h.hidden = false;
  h.innerHTML = `💡 힌트 쪽지: ${fmt(p.hint)}`;
  const btn = $(".hint-btn", body);
  if (btn) btn.hidden = true;
}

function lockSolved(body) {
  const ans = $(".answer", body);
  ans.innerHTML = `<div class="solved-badge">🗝️ 열쇠 조각을 얻었어요! 이 유물 조각은 제단으로 보내졌어요.</div>`;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn primary";
  b.textContent = "계속 탐험하기 →";
  b.onclick = closeModal;
  ans.appendChild(b);
}

function onResult(msg) {
  S.waiting = false;
  if (msg.pid !== S.pid) return;
  const body = $("#modal-body");
  const p = PROBLEMS.find((x) => x.id === msg.pid);
  if (msg.invalid) return feedback("답의 형식을 확인해 주세요. 예: 4, −3, 1/2, 2√5, π/2", "warn");
  if (msg.ok) {
    feedback(msg.already ? "이미 연 상자예요." : `정답! ${p.icon} 상자가 열렸어요.`, "ok");
    if (!msg.already) sound.sfx("correct");
    lockSolved(body);
    return;
  }
  feedback(`딸깍… 상자가 열리지 않아요. 다시 생각해 볼까요? (${msg.tries}번째 시도)`, "bad");
  sound.sfx("wrong");
  if (msg.tries >= 2) showHint(body, p);
}

// 유물 제단: 반 전체 협동 현황
function showAltar() {
  const body = openModal(false);
  const lit = altarLit();
  body.innerHTML = `
    <div class="p-head"><span class="p-icon">🏛️</span>
      <div><h2>유물 제단</h2><small>반 친구들이 같은 문제를 풀수록 유물이 깨어나요</small></div></div>
    <p>${lit ? "🎉 유물 7개가 모두 깨어났어요! 우리 반 유적 탈출 성공!" : "아직 잠든 유물이 있어요. 친구들이 각자 방을 탈출하면 유물이 하나씩 깨어나요."}</p>
    <div class="class-bar in-modal"></div>`;
  renderClassBar($(".class-bar", body), S.cls, { showEnergy: true, showShelf: true });
}

function showSummary() {
  const body = openModal(false);
  const mine = PROBLEMS.filter((p) => solved(p.id)).length;
  const unlocked = PROBLEMS.filter((p) => S.cls?.relics[p.id]?.unlocked).length;
  body.innerHTML = `
    <div class="done">
      <h2>탐험 끝!</h2>
      <p class="big-num">우리 반이 깨운 유물 <b>${unlocked}</b> / ${PROBLEMS.length}</p>
      <p>내가 연 상자 <b>${mine}</b> / ${PROBLEMS.length} · 벡터 점프 ${S.me?.lab.length ?? 0} / ${LAB_LEVELS.length}</p>
    </div>`;
  const ul = document.createElement("ul");
  ul.className = "mine";
  for (const p of PROBLEMS) {
    const m = S.me?.probs[p.id];
    const li = document.createElement("li");
    li.textContent = `${p.icon} ${p.relic} — ${m?.solved ? (m.firstTry ? "★ 한 번에 정답" : `✓ 정답 (${m.tries}번 시도)`) : m?.tries ? `✗ 아직 (${m.tries}번 시도)` : "– 못 연 상자"}`;
    ul.appendChild(li);
  }
  $(".done", body).appendChild(ul);
}
