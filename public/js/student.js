import { connect, store } from "./net.js";
import { fmt, watchMath } from "./mathtext.js";
import { LAB_LEVELS } from "./lab.js";
import { PROBLEMS, DIFFICULTY } from "./problems.js";
import { conceptCard, CONCEPTS, mountConceptWidget } from "./concepts.js";
import { renderClassBar } from "./classbar.js";
import { Game, ROOMS, DOORS, BRIDGES, OBJECTS, ALTAR, roomAt, W, H, buildGrid, DOOR_COLS, DOOR_ROWS } from "./game.js";
import { World3D } from "./world3d.js";
import { sound } from "./sound.js";
import { createIntro } from "./intro.js";
import { settings, updateSettings, onSettings } from "./settings.js";

const $ = (s, root = document) => root.querySelector(s);
const STAGE_NAME = { lobby: "대기 중", play: "탐험 중", done: "탐험 끝" };
// 팀전: 팀 이름·색은 서버(src/room.js)와 짝을 이룬다.
const TEAMS = { A: { name: "A팀", color: "#ef4444" }, B: { name: "B팀", color: "#3b82f6" }, C: { name: "C팀", color: "#22c55e" }, D: { name: "D팀", color: "#a855f7" } };
// 수업 채널: URL의 ?ch=1~5. 없으면 입장 화면에서 고르고, 그것도 없으면 1채널.
const CHANNELS = ["1", "2", "3", "4", "5"];
const urlCh = new URLSearchParams(location.search).get("ch");
const CH = CHANNELS.includes(urlCh) ? urlCh : null;
const CLOSE_REASON = {
  4000: "지난 수업 기록이 정리되었어요. 다시 들어와 주세요.",
  4001: "이름을 확인해 주세요.",
  4002: "유적 인원이 가득 찼어요. 선생님께 알려 주세요.",
  4005: "다른 창에서 같은 이름으로 들어와서 이 창의 연결을 끊었어요.",
  4006: "선생님이 새 수업을 시작했어요. 이름을 확인하고 다시 들어와 주세요.",
  4007: "선생님이 수업에서 내보냈어요. 선생님께 문의해 주세요.",
};

let cid = store("vr-cid");
if (typeof cid !== "string" || !/^[a-z0-9]{8,32}$/.test(cid)) {
  cid = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => (b % 36).toString(36)).join("");
  store("vr-cid", cid);
}

const S = { net: null, name: null, me: null, cls: null, game: null, world: null, modal: null, waiting: false, team: "", ch: CH ?? store("vr-ch") ?? "1" };
if (!CHANNELS.includes(S.ch)) S.ch = "1";
if (["127.0.0.1", "localhost"].includes(location.hostname)) window.__vr = S; // 이 컴퓨터에서 개발할 때만 점검용으로 연다

const solved = (pid) => !!S.me?.probs[pid]?.solved;
const labDone = (lab) => !!S.me?.lab.includes(lab);
const doorOpen = (id) => DOORS[id].every(solved);
const altarLit = () => !!S.cls && PROBLEMS.every((p) => S.cls.relics[p.id]?.unlocked);
// 팀전: 캐릭터 번호(n) → 팀 이름. 미니맵 마커와 랭킹 뱃지가 쓴다.
const teamOf = (n) => {
  const r = (S.cls?.ranking ?? []).find((r) => r.n === n);
  return r?.team ?? null;
};

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

// 팀 선택: 기본은 자동 배정(""). 고르면 입장할 때 서버에 함께 보낸다.
document.querySelectorAll(".team-opt[data-team]").forEach((b) => {
  b.onclick = () => {
    S.team = b.dataset.team;
    document.querySelectorAll(".team-opt[data-team]").forEach((o) => o.classList.toggle("on", o === b));
    sound.sfx("open");
  };
});

// 수업 채널 선택(1~5): URL의 ?ch=가 있으면 그 채널로 정해지고 선택기는 감춘다.
document.querySelectorAll(".ch-opt[data-ch]").forEach((b) => {
  b.classList.toggle("on", b.dataset.ch === S.ch);
  b.onclick = () => {
    S.ch = b.dataset.ch;
    store("vr-ch", S.ch);
    document.querySelectorAll(".ch-opt[data-ch]").forEach((o) => o.classList.toggle("on", o === b));
    sound.sfx("open");
  };
});
if (CH) $("#channel-pick").hidden = true;

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
  const query = mode === "practice" ? `?mode=practice&cid=${cid}` : `?ch=${S.ch}`;
  S.net = connect(() => ({ type: "hello", role: "student", cid, name: S.name, team: S.team || undefined }), onMessage, onStatus, query);
}

// 연습 모드 '처음부터 다시' 뒤에는 새로고침하고 자동으로 다시 들어온다.
const autojoin = (() => { try { const v = sessionStorage.getItem("vr-autojoin"); sessionStorage.removeItem("vr-autojoin"); return v; } catch { return null; } })();
if (autojoin === "practice" && session?.name) { showScreen("menu"); join(session.name, "practice"); }

// 학생 화면의 '선생님: 수업 탐험 시작'. 시작 비밀번호가 맞으면 수업 유적의 탐험이 시작된다.
function askStart() {
  const code = prompt("수업 탐험을 시작할 선생님 비밀번호를 입력하세요.");
  if (!code) return;
  if (S.net && S.mode === "class") return S.net.send({ type: "start", code: code.trim() });
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws?ch=${S.ch}`);
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
    $("#mode-chip").textContent = S.mode === "practice" ? "🎯 혼자 연습" : `🏫 수업 참여 · ${S.ch}채널`;
    $("#restart-btn").hidden = S.mode !== "practice";
    if (!S.game) startWorld();
    S.game.setMe(msg.n, msg.name);
    if (msg.pos) { S.game.me.x = msg.pos.x; S.game.me.y = msg.pos.y; } // 새로고침해도 하던 자리에서
    S.game.forceSend();
    // 모바일/터치 기기에서는 지도로 조작 버튼이 가려지지 않도록 기본은 닫아 두고, 🗺️ 버튼을 눌렀을 때만 연다
    $("#minimap").hidden = document.body.classList.contains("touch-device") || window.innerWidth <= 768;
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
  } else if (msg.type === "chat") {
    addChat(msg);
  } else if (msg.type === "kicked") {
    alert(msg.reason ?? "선생님에 의해 퇴장되었어요.");
  } else if (msg.type === "result") {
    onResult(msg);
  } else if (msg.type === "started") {
    toast("🔑 수업 탐험을 시작했어요!", "ok");
  } else if (msg.type === "restarted") {
    try { sessionStorage.setItem("vr-autojoin", "practice"); } catch {}
    location.reload();
  } else if (msg.type === "found") {
    if (msg.n !== S.game?.me.n) showFound(msg); // 내 발견은 문제 창에서 이미 축하한다
  } else if (msg.type === "review") {
    reviewAnswers = msg.answers ?? null;
    toast("📄 정답표를 받았어요. 결과 화면에서 오답 정리를 인쇄할 수 있어요.", "ok");
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
  onShoot: () => { S.world?.shoot(); sound.sfx("shoot"); },
  // 표적 10발 완성: 그 구역의 핵심 개념 카드가 자동으로 열리고 해금된다 (+50점)
  onTargetHit: (t) => {
    sound.sfx("target");
    toast(`🎯 표적 10발 완성! '${CONCEPTS[t.concept]?.title ?? ""}' 개념 카드가 해금되었어요.`, "ok");
    showConcept(t.concept, closeModal, "problem");
  },
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

// ---------- 학생 간 실시간 채팅 ----------
const chatLog = () => $("#chat-log");
let chatUnread = 0;

function addChat(msg) {
  const log = chatLog();
  const row = document.createElement("div");
  row.className = "chat-row";
  const team = TEAMS[msg.team];
  if (team) {
    const badge = document.createElement("span");
    badge.className = "chat-team";
    badge.style.background = team.color;
    badge.textContent = team.name.replace("팀", "");
    row.appendChild(badge);
  }
  const name = document.createElement("span");
  name.className = "chat-name";
  name.textContent = msg.name ?? "";
  const text = document.createElement("span");
  text.className = "chat-text";
  text.textContent = msg.text ?? ""; // 채팅 본문은 HTML로 조판하지 않고 그대로 보여 준다
  row.append(name, text);
  log.appendChild(row);
  while (log.childElementCount > 60) log.firstChild.remove(); // 오래된 말은 지운다
  log.scrollTop = log.scrollHeight;
  if ($("#chat-panel").hidden) {
    chatUnread++;
    const b = $("#chat-unread");
    b.hidden = false;
    b.textContent = chatUnread > 9 ? "9+" : String(chatUnread);
  }
}

function openChat(open) {
  $("#chat-panel").hidden = !open;
  $("#chat-toggle").hidden = open;
  if (open) {
    chatUnread = 0;
    $("#chat-unread").hidden = true;
    setupChatDragging(); // 저장된 위치 복원 (드래그 핸들 = 채팅창 헤더)
    $("#chat-input").focus();
  }
}
$("#chat-toggle").onclick = () => { openChat(true); $("#world")?.focus(); $("#chat-input").focus(); };
$("#chat-close").onclick = () => { openChat(false); $("#world")?.focus(); };
$("#chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#chat-input");
  const text = input.value.trim().slice(0, 100);
  if (!text) return;
  S.net?.send({ type: "chat", text });
  input.value = "";
  input.focus();
});

// ---------- 터치 기기용 가상 조작판 ----------
function setupTouchControls() {
  if (!("ontouchstart" in window) && navigator.maxTouchPoints === 0) return;
  document.body.classList.add("touch-device");
  $("#touch-dpad").hidden = false;
  $("#touch-actions").hidden = false;

  const DIRS = {
    "dpad-up": [0, -1], "dpad-down": [0, 1], "dpad-left": [-1, 0], "dpad-right": [1, 0],
  };
  const held = new Map();
  const apply = () => {
    let x = 0, y = 0;
    for (const [dx, dy] of held.values()) { x += dx; y += dy; }
    S.game?.setTouch(Math.sign(x), Math.sign(y));
  };
  for (const [id, dir] of Object.entries(DIRS)) {
    const btn = document.getElementById(id);
    btn.addEventListener("touchstart", (e) => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); held.set(id, dir); apply(); }, { passive: false });
    for (const ev of ["touchend", "touchcancel"])
      btn.addEventListener(ev, (e) => { e.preventDefault(); held.delete(id); apply(); }, { passive: false });
  }
  $("#touch-jump").addEventListener("touchstart", (e) => { e.preventDefault(); S.game?.jump(); }, { passive: false });
  // 열기 버튼: 터치·펜·마우스 어디서든 확실히 먹도록 touchstart·pointerdown·click을 모두 연동한다.
  // 먼저 열린 조작으로 창이 열리면 paused()가 되어 두 번째 조작은 무시된다.
  const act = () => S.game?.touchInteract();
  for (const ev of ["touchstart", "pointerdown", "click"])
    $("#touch-act").addEventListener(ev, (e) => { e.preventDefault(); act(); }, { passive: false });
  // 🎯 사격 버튼: G키와 같다.
  const shoot = () => S.game?.shoot();
  for (const ev of ["touchstart", "pointerdown"])
    $("#touch-shoot").addEventListener(ev, (e) => { e.preventDefault(); shoot(); }, { passive: false });
  setupPadDragging();
}

// ---------- 가상 조작판·채팅창 드래그 이동 ----------
// 핸들을 드래그하면 그룹(#touch-dpad, #touch-actions, #chat-panel)이 움직인다.
// 뷰포트 밖으로 나가지 않게 경계를 확인하고, 위치는 localStorage에 저장해 새로고침에도 유지한다.
function clampPos(el, x, y) {
  const w = el.offsetWidth, h = el.offsetHeight;
  return {
    x: Math.min(Math.max(4, x), window.innerWidth - w - 4),
    y: Math.min(Math.max(4, y), window.innerHeight - h - 4),
  };
}

function makeDraggable(el, handle, key) {
  if (el.__vrDrag) return; // 두 번 붙이면 드래그가 겹치므로 한 번만
  el.__vrDrag = true;
  // 저장된 위치가 있으면 복원한다
  const saved = store(key);
  const restore = () => {
    if (!saved || !el.isConnected) return;
    const pos = clampPos(el, saved.x, saved.y);
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.style.right = "auto";
    el.style.bottom = "auto";
  };
  el.__vrRestore = restore;
  window.addEventListener("resize", () => {
    if (el.style.left) {
      const pos = clampPos(el, parseFloat(el.style.left), parseFloat(el.style.top));
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
    }
  });
  let off = null;
  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    handle.setPointerCapture?.(e.pointerId);
    const r = el.getBoundingClientRect();
    off = { x: e.clientX - r.left, y: e.clientY - r.top };
    handle.classList.add("dragging");
  });
  handle.addEventListener("pointermove", (e) => {
    if (!off) return;
    const pos = clampPos(el, e.clientX - off.x, e.clientY - off.y);
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.style.right = "auto";
    el.style.bottom = "auto";
  });
  const end = () => {
    if (!off) return;
    off = null;
    handle.classList.remove("dragging");
    if (el.style.left) store(key, { x: parseFloat(el.style.left), y: parseFloat(el.style.top) });
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}

function setupPadDragging() {
  makeDraggable($("#touch-dpad"), $("#dpad-handle"), "vr-dpad-pos");
  makeDraggable($("#touch-actions"), $("#actions-handle"), "vr-actions-pos");
}

function setupChatDragging() {
  makeDraggable($("#chat-panel"), $("#chat-head"), "vr-chat-pos");
  $("#chat-panel").__vrRestore?.(); // 열릴 때마다 저장된 위치로
}
setupTouchControls();

function updateHud() {
  if (!S.game) return;
  const room = roomAt(S.game.me.x);
  $("#hud-room").textContent = ROOMS[room].name;
  sound.setIntensity(room); // 다음 방으로 갈수록 음악이 고조된다
  const keys = PROBLEMS.filter((p) => solved(p.id)).length;
  $("#hud-keys").textContent = `🗝️ ${keys}/${PROBLEMS.length}`;
  $("#hud-jumps").textContent = `✨ ${S.me?.lab.length ?? 0}/${LAB_LEVELS.length}`;
  const myRow = (S.cls?.ranking ?? []).find((r) => r.n === S.game.me.n);
  $("#hud-mile").textContent = `🏃 ${myRow?.mileage ?? 0}`;
  $("#hud-mile").title = "활동 마일리지 (이동·점프·사격·개념 학습)";
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
    renderTeamChip();
    renderTeamRanking();
    renderRanking();
    drawMinimap();
  }
}
setInterval(updateHud, 500); // 방 이름은 움직일 때 바뀐다

// 팀전: 내 팀 뱃지(상단바)와 팀 랭킹(오른쪽 위) — 팀 컬러 바와 순위 메달로 크고 직관적으로
function renderTeamChip() {
  const chip = $("#team-chip");
  if (S.mode === "practice") { chip.hidden = true; return; }
  const team = teamOf(S.game?.me.n);
  if (!team || !TEAMS[team]) { chip.hidden = true; return; }
  chip.hidden = false;
  chip.classList.add("team-chip");
  chip.style.setProperty("--team", TEAMS[team].color);
  chip.textContent = `${TEAMS[team].name}`;
}

function renderTeamRanking() {
  const box = $("#hud-teams");
  if (S.mode === "practice") { box.hidden = true; return; }
  const list = S.cls.teams ?? [];
  if (!list.length) { box.hidden = true; return; }
  const key = JSON.stringify(list.map((t) => [t.team, t.score, t.members]));
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  box.hidden = false;
  box.replaceChildren();
  const title = document.createElement("li");
  title.className = "rank-title";
  title.textContent = "🚩 팀 랭킹";
  box.appendChild(title);
  const top = Math.max(1, ...list.map((t) => t.score)); // 점수 바의 기준 (1등 팀 = 100%)
  for (const t of list) {
    const li = document.createElement("li");
    const mine = teamOf(S.game?.me.n) === t.team;
    if (mine) li.className = "mine";
    const badge = document.createElement("span");
    badge.className = "team-dot";
    badge.style.background = TEAMS[t.team]?.color ?? "#94a3b8";
    const medal = ["🥇", "🥈", "🥉"][t.rank - 1] ?? `${t.rank}.`;
    const nm = document.createElement("span");
    nm.className = "nm";
    nm.textContent = `${medal} ${TEAMS[t.team]?.name ?? t.team} · ${t.members}명${t.escaped ? " 🏁" : ""}`;
    const sc = document.createElement("span");
    sc.className = "sc";
    sc.textContent = `${t.score}점`;
    const bar = document.createElement("i"); // 팀 컬러 점수 바 (li 전체 폭 기준)
    bar.className = "tbar";
    bar.style.setProperty("--w", `${Math.max(6, Math.round((t.score / top) * 100))}%`);
    bar.style.setProperty("--team", TEAMS[t.team]?.color ?? "#94a3b8");
    li.append(badge, nm, sc, bar);
    box.appendChild(li);
  }
}

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
    const team = TEAMS[r.team];
    for (const [cls, text] of [["pos", medal], ["nm", `${r.name}${r.escaped ? " 🏁" : ""}`], ["sc", `${r.score}점`]]) {
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = text;
      li.appendChild(s);
    }
    if (team) {
      const dot = document.createElement("span");
      dot.className = "team-dot";
      dot.title = `${team.name}`;
      dot.style.background = team.color;
      li.appendChild(dot);
    }
    box.appendChild(li);
  }
}

// 조작 활동 마일리지: 5초마다 게임이 모아 둔 이동·점프·사격량을 서버에 보낸다.
setInterval(() => {
  const a = S.game?.drainActivity?.();
  if (!a || (!a.dist && !a.jumps && !a.shots)) return;
  S.net?.send({ type: "activity", dist: Math.round(a.dist * 10) / 10, jumps: a.jumps, shots: a.shots });
}, 5000);

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

$( "#modal-close").onclick = closeModal;
// 문제·실험 창 안의 '📚 개념 카드' 버튼: 그 문제(또는 실험)의 개념 카드를 다시 연다.
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".link-card-btn[data-concept]");
  if (!btn) return;
  const key = btn.dataset.concept;
  if (key[0] === "l") {
    const br = Object.values(BRIDGES).find((b) => b.lab === key);
    if (br) return showConcept(key, () => openBridgeBody(br), "bridge");
  }
  showConcept(key, () => openProblemBody(key), "problem");
});
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

// ---------- 미니맵: 유적 4개 방 전체를 위에서 본 지도 ----------
const mapCanvas = $("#map-canvas");
let mapGrid = null; // 벽·위험지대 그리기용 격자 (한 번만 만든다)

$("#map-btn").onclick = () => { $("#minimap").hidden = !$("#minimap").hidden; if (!$("#minimap").hidden) drawMinimap(); };
$("#minimap-close").onclick = () => { $("#minimap").hidden = true; };
$("#rank-btn").onclick = () => { $(".hud-right")?.classList.toggle("open"); };

function drawMinimap() {
  if ($("#minimap").hidden || !S.game) return;
  mapGrid ??= buildGrid();
  const cell = 7; // 지도 한 칸의 픽셀 (지도 크기에 맞춰 화면에 맞춰 축소된다)
  const c = mapCanvas;
  const w = W * cell, h = H * cell + 14;
  if (c.width !== w) { c.width = w; c.height = h; }
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);

  // 바탕과 방 구분: 방별 옅은 색 띠
  const ROOM_FILL = ["rgba(255,226,176,0.20)", "rgba(210,240,192,0.20)", "rgba(207,220,255,0.22)", "rgba(255,220,138,0.25)"];
  for (let r = 0; r < ROOMS.length; r++) {
    const x1 = r === 0 ? 1 : ROOMS[r - 1].x1 + 1, x2 = r === ROOMS.length - 1 ? W - 2 : ROOMS[r].x1;
    ctx.fillStyle = ROOM_FILL[r];
    ctx.fillRect(x1 * cell, cell, (x2 - x1 + 1) * cell, (H - 2) * cell);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 9px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ROOMS[r].name, (x1 + x2 + 1) / 2 * cell, H * cell + 10);
  }
  // 벽
  ctx.fillStyle = "rgba(120,100,70,0.9)";
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = mapGrid[y][x];
    if (ch === "#") ctx.fillRect(x * cell, y * cell, cell, cell);
    else if (ch === "~") { ctx.fillStyle = "rgba(59,155,224,0.7)"; ctx.fillRect(x * cell, y * cell, cell, cell); ctx.fillStyle = "rgba(120,100,70,0.9)"; }
    else if (ch === "^") { ctx.fillStyle = "rgba(60,50,80,0.8)"; ctx.fillRect(x * cell, y * cell, cell, cell); ctx.fillStyle = "rgba(120,100,70,0.9)"; }
    else if (ch === "!") { ctx.fillStyle = "rgba(255,90,31,0.75)"; ctx.fillRect(x * cell, y * cell, cell, cell); ctx.fillStyle = "rgba(120,100,70,0.9)"; }
  }
  // 문 (열렸으면 밝게)
  for (const [id, col] of Object.entries(DOOR_COLS)) {
    const open = DOORS[id].every(solved);
    ctx.fillStyle = open ? "rgba(52,211,153,0.9)" : "rgba(245,158,11,0.95)";
    for (const r of DOOR_ROWS) ctx.fillRect(col * cell, r * cell, cell, cell);
  }
  // 다리 자리 (완료했으면 판자색)
  for (const br of Object.values(BRIDGES)) {
    ctx.fillStyle = labDone(br.lab) ? "rgba(160,102,43,0.95)" : "rgba(103,232,249,0.8)";
    ctx.fillRect((br.cx - 1) * cell, (br.cy - 1) * cell, cell * 2, cell * 2);
  }
  // 보물상자·유물 제단
  ctx.font = `${cell}px serif`;
  ctx.textAlign = "center";
  for (const o of OBJECTS) ctx.fillText(o.icon, (o.x + 0.5) * cell, (o.y + 0.9) * cell);
  ctx.fillText("🏛️", (ALTAR.x + 0.5) * cell, (ALTAR.y + 0.9) * cell);

  // 팀원·나: 팀 색 원 마커. 이름은 작게.
  const marker = (x, y, color, label, isMe) => {
    const px = x * cell, py = y * cell;
    ctx.beginPath();
    ctx.arc(px, py, isMe ? 5 : 3.6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = isMe ? 2 : 1;
    ctx.strokeStyle = isMe ? "#5eead4" : "rgba(255,255,255,0.9)";
    ctx.stroke();
    if (isMe || !label) return;
    ctx.fillStyle = color;
    ctx.font = "bold 8px Pretendard, sans-serif";
    ctx.fillText(label, px, py - 6);
  };
  for (const [n, o] of S.game.others) {
    const team = TEAMS[teamOf(n)];
    marker(o.x + 0.5, o.y + 0.5, team?.color ?? "#94a3b8", S.game.names.get(n) ?? "", false);
  }
  const myTeam = TEAMS[teamOf(S.game.me.n)];
  marker(S.game.me.x, S.game.me.y, myTeam?.color ?? "#5eead4", "", true);
}

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
  // 실험실 개념 카드(삼각형법·평행사변형법·실수배)를 먼저 보여 주고, 도전하기를 누르면 본체가 나온다.
  if (CONCEPTS[br.lab]) return showConcept(br.lab, () => openBridgeBody(br), "bridge");
  return openBridgeBody(br);
}

function openBridgeBody(br) {
  const idx = LAB_LEVELS.findIndex((l) => l.id === br.lab);
  const lv = LAB_LEVELS[idx];
  const body = openModal();
  sound.sfx("open");
  body.innerHTML = `
    <div class="p-head"><span class="p-icon">✨</span>
      <div><h2>${br.title}: 벡터 점프</h2><small>벡터 실험 ${idx + 1} · ${lv.title}${CONCEPTS[br.lab] ? ` · <button class="link-card-btn" type="button" data-concept="${br.lab}">📚 개념 카드</button>` : ""}</small></div></div>
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

// 상자: 문제. 열면 먼저 개념 학습 카드(세션에서 한 번씩), 이어서 난이도를 골라 문제 본문이 나온다.
function openProblem(pid) {
  const mine = S.me?.probs[pid];
  // 이미 푼 상자를 다시 열 때는 바로 본문으로. 안 푼 상자는 개념 카드 → 난이도 선택 → 본문 순서.
  if (mine?.solved) return openProblemBody(pid);
  if (!conceptSeen.has(pid) && CONCEPTS[pid]) return showConcept(pid, () => showDifficulty(pid), "problem");
  return showDifficulty(pid);
}

// 난이도 선택: 상(150점)·중(100점)·하(70점) 중 고른다. 정답을 맞히면 그 배점대로 점수를 준다.
function showDifficulty(pid) {
  const obj = OBJECTS.find((o) => o.pid === pid);
  const body = openModal();
  body.innerHTML = `
    <div class="p-head"><span class="p-icon">${obj.icon}</span>
      <div><h2>난이도를 고르세요</h2><small>높은 난이도를 고를수록 받는 점수가 커져요. 문제는 같고 배점만 달라요.</small></div></div>
    <div class="diff-row">
      ${DIFFICULTY.map((d) => `
        <button class="diff-btn" type="button" data-diff="${d.key}">
          <b>${d.name}</b><small>${d.desc}</small><span class="diff-pts">${d.points}점</span>
        </button>`).join("")}
    </div>`;
  sound.sfx("open");
  for (const btn of body.querySelectorAll(".diff-btn"))
    btn.onclick = () => { S.diff = btn.dataset.diff; sound.sfx("open"); openProblemBody(pid); };
}

const conceptSeen = new Set(); // 이 세션에서 개념 카드를 본 문제·실험
const conceptSent = new Set(); // 학습 점수(+50)를 서버에 알린 카드 (서버도 한 번만 매긴다)
const awardConcept = (key) => {
  if (conceptSent.has(key)) return;
  conceptSent.add(key);
  S.net?.send({ type: "concept", key }); // 개념 학습 포인트 +50 (문제 풀이보다 작지만 학습 자체가 점수가 돼요)
};

// 개념 카드 팝업: 학습을 돕는다. 직접 조작하다가 '학습 완료'(+50점) 또는 '문제 풀기'를 누른다.
function showConcept(key, next, kind) {
  conceptSeen.add(key);
  const goLabel = next === closeModal ? "계속 탐험하기 →" : kind === "bridge" ? "도전하기 →" : "문제 풀기 →";
  const body = openModal();
  body.innerHTML = `
    ${conceptCard(null, key, { fmt })}
    <div class="concept-actions">
      <button class="btn" type="button" data-reopen="1">📚 카드 다시 보기</button>
      <button class="btn" type="button" id="concept-done">💡 학습 완료 +50</button>
      <button class="btn primary big" type="button" id="concept-go">${goLabel}</button>
    </div>`;
  sound.sfx("open");
  mountConceptWidget(key, $(".concept-widget", body));
  $("#concept-done", body).onclick = () => {
    awardConcept(key);
    toast("💡 개념 학습 +50점! 팀 점수에도 더해졌어요.", "ok");
    sound.sfx("found");
    next();
  };
  $("#concept-go", body).onclick = () => { awardConcept(key); next(); };
  $("[data-reopen]", body).onclick = () => showConcept(key, next, kind);
}

function openProblemBody(pid) {
  const p = PROBLEMS.find((x) => x.id === pid);
  const obj = OBJECTS.find((o) => o.pid === pid);
  const idx = PROBLEMS.indexOf(p);
  const diff = DIFFICULTY.find((d) => d.key === S.diff);
  const body = openModal();
  sound.sfx("open");
  S.pid = pid;
  S.waiting = false;
  body.innerHTML = `
    <div class="p-head"><span class="p-icon">${obj.icon}</span>
      <div><h2>${obj.name}을(를) 열었더니… 문제 ${idx + 1}</h2><small>${p.level} · 교과서 ${p.source}${diff ? ` · <b class="diff-chip">${diff.name} 난이도 ${diff.points}점</b>` : ""} · 맞히면 🗝️ 열쇠 조각과 ${p.icon} ${p.relic} 조각${CONCEPTS[pid] ? ` · <button class="link-card-btn" type="button" data-concept="${pid}">📚 개념 카드</button>` : ""}</small></div></div>
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
  if (mine?.solved) {
    S.diff = null; // 이미 푼 상자를 다시 보는 것이므로 난이도 배점은 다시 매기지 않는다
    lockSolved(body);
  } else {
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
  if (!S.net.send({ type: "submit", pid, answer, diff: S.diff })) return feedback("연결이 끊겼어요. 잠시 후 다시 제출해 주세요.", "warn");
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
  // 오답 정리 인쇄용 정답표: 탐험이 끝나면 서버가 내려 준다(reviewAnswers에 저장).
  S.net?.send({ type: "review" });
  body.innerHTML = `
    <div class="done">
      <h2>탐험 끝!</h2>
      <p class="big-num">우리 반이 깨운 유물 <b>${unlocked}</b> / ${PROBLEMS.length}</p>
      <p>내가 연 상자 <b>${mine}</b> / ${PROBLEMS.length} · 벡터 점프 ${S.me?.lab.length ?? 0} / ${LAB_LEVELS.length}</p>
      <div class="summary-actions"><button id="print-btn" class="btn primary" type="button">📄 오답 정리 A4로 인쇄 (PDF)</button></div>
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
  $("#print-btn", body).onclick = printReview;
}

// 오답 정리: 내가 틀리거나 못 푼 문제를 문제·내가 낸 오답·정답·풀이로 정리해 A4 인쇄 창에 채운다.
let reviewAnswers = null; // 서버가 내려 준 정답표 (탐험 끝 이후에만)

function printReview() {
  const area = $("#print-area");
  const rows = PROBLEMS.map((p, i) => {
    const m = S.me?.probs[p.id];
    const wrongs = m?.wrongs?.length ? m.wrongs.join(", ") : m?.tries ? "형식 오류 없이 오답" : null;
    const status = m?.solved ? (m.firstTry ? "★ 한 번에 정답" : `✓ 정답 (${m.tries}번 시도)`) : m?.tries ? `✗ ${m.tries}번 시도, 미해결` : "미응시";
    const need = !m?.solved || !m.firstTry; // 틀리거나 여러 번 시도한 문제만 자세히
    if (!need) return "";
    return `
      <section class="pr-item">
        <h3>${i + 1}. ${p.icon} ${p.relic} <small>${p.level} · ${p.source}</small> <span class="pr-status">${status}</span></h3>
        <p class="pr-text">${fmt(p.text)}</p>
        ${wrongs ? `<p class="pr-wrongs"><b>내가 낸 답:</b> ${wrongs}</p>` : ""}
        <p class="pr-answer"><b>정답:</b> ${fmt(reviewAnswers?.[p.id] ?? "탐험이 끝나면 공개돼요")}</p>
        <p class="pr-hint"><b>풀이</b>: ${fmt(p.hint)}</p>
      </section>`;
  }).join("");
  area.innerHTML = `
    <header class="pr-head">
      <h1>벡터 유적 탈출 · 나의 오답 정리</h1>
      <p>${S.name ?? ""} · ${new Date().toLocaleDateString("ko-KR")} · 맞힌 문제 ${PROBLEMS.filter((p) => solved(p.id)).length}/${PROBLEMS.length}</p>
    </header>
    ${rows || "<p>틀린 문제가 없어요! 모든 문제를 한 번에 맞혔어요. 🎉</p>"}`;
  area.hidden = false;
  // 수식(MathJax) 조판이 끈 뒤 인쇄 창을 연다
  setTimeout(() => {
    window.print();
    setTimeout(() => { area.hidden = true; }, 300);
  }, 600);
}
