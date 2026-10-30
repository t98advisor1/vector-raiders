// 유적 하나 = Durable Object 하나. 방 코드 없이 모든 학생이 이 유적에 들어온다.
// 학생 진행 상황을 저장하고, 반 전체 협동 현황(벡터 점프 에너지, 유물)과 친구들 위치를 모두에게 알린다.
// WebSocket Hibernation API를 써서 조용한 동안에는 비용이 들지 않게 한다.
import { DurableObject } from "cloudflare:workers";
import { checkAnswer, PROBLEM_IDS, ANSWER_TEXT } from "./answers.js";
import { SheetLog } from "./sheets.js";

const STAGES = ["lobby", "play", "done"];
const MAP_W = 58, MAP_H = 13, ROOM_COUNT = 4; // public/js/game.js의 지도 크기
const POS_TICK_MS = 200; // 위치는 모아서 0.2초마다 한 번 보낸다
const POS_IDLE_TICKS = 150; // 30초 동안 아무도 움직이지 않으면 타이머를 멈춘다
const LAB_LEVELS = ["l1", "l2", "l3", "l4", "l5"];
const MAX_STUDENTS = 40;
const MAX_TRIES = 20;
const UNLOCK_RATIO = 0.7;
const SCORE = { solve: 100, firstTry: 50, jump: 20 };
// 팀전: 학생이 들어올 때마다 가장 사람이 적은 팀에 한 명씩 나눠 담는다.
const TEAMS = ["A", "B", "C", "D"];
const TEAM_NAMES = { A: "A팀", B: "B팀", C: "C팀", D: "D팀" };
const LAB_NAMES = { l1: "삼각형법", l2: "평행사변형법", l3: "실수배", l4: "길 찾기", l5: "길 찾기 2" };
const STAGE_NAMES = { lobby: "대기", play: "탐험 시작", done: "탐험 끝" };
const problemName = (pid) => `문제 ${pid.slice(1)}`;
const ROOM_TTL_MS = 24 * 60 * 60 * 1000; // 마지막 활동 뒤 24시간이 지나면 수업 기록을 지운다
const TTL_REFRESH_MS = 60 * 60 * 1000; // 삭제 예약은 한 시간에 한 번만 뒤로 미룬다
const MAX_MESSAGE = 2048;

// mode: "class"(반 전체가 함께하는 수업 유적) 또는 "practice"(학생 한 명의 연습 유적, 바로 탐험 시작)
const freshData = (mode = "class") => ({ mode, createdAt: Date.now(), stage: mode === "practice" ? "play" : "lobby", students: {}, unlocked: [] });

// 비밀번호 비교: 길이가 같으면 글자마다 모두 비교한다.
function samePassword(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cleanName(raw) {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 12);
}

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.data = null;
    this.pending = null;
    // 위치는 저장하지 않는다. 방이 잠들었다 깨면 학생이 다음에 움직일 때 다시 채워진다.
    this.pos = new Map();
    this.lastPos = new Map(); // 연결이 끊겨도 남겨 두었다가 다시 들어오면 그 자리에서 시작한다
    this.posDirty = false;
    this.posTimer = null;
    this.posIdle = 0;
    this.ttlSetAt = 0;
    this.sheet = new SheetLog(env, () => this.sheetSummaries());
    ctx.blockConcurrencyWhile(async () => {
      this.data = (await ctx.storage.get("data")) ?? null;
    });
  }

  async fetch(request) {
    // 연습 유적인지는 진입점(worker.js)이 알려 준다. 처음 열릴 때만 정해진다.
    this.mode ??= request.headers.get("X-Room-Mode") === "practice" ? "practice" : "class";
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ role: null });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async alarm() {
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.close(4000, "room expired"); } catch {}
    }
    await this.ctx.storage.deleteAll();
    this.data = null;
  }

  async save() {
    await this.ctx.storage.put("data", this.data);
    if (Date.now() - this.ttlSetAt > TTL_REFRESH_MS) {
      this.ttlSetAt = Date.now();
      await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
    }
  }

  send(ws, msg) {
    try { ws.send(JSON.stringify(msg)); } catch {}
  }

  async webSocketMessage(ws, raw) {
    this.data ??= freshData(this.mode); // 기록이 지워진 뒤 처음 들어오면 새 유적을 연다
    if (typeof raw !== "string" || raw.length > MAX_MESSAGE) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const who = ws.deserializeAttachment() ?? { role: null };

    if (msg.type === "hello") return this.onHello(ws, msg);
    if (msg.type === "start") return this.onStartCode(ws, msg);
    if (who.role === "teacher") return this.onTeacher(ws, msg);
    if (who.role === "student") return this.onStudent(ws, who.cid, msg);
  }

  async webSocketClose(ws, code) {
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, "bye"); } catch {}
    this.logLeave(ws);
    this.dropPosition(ws);
    this.scheduleBroadcast();
  }

  async webSocketError(ws) {
    this.logLeave(ws);
    this.dropPosition(ws);
    this.scheduleBroadcast();
  }

  // 학생이 마지막 창까지 닫으면 '퇴장'을 남긴다.
  logLeave(ws) {
    const a = ws.deserializeAttachment();
    const st = a?.role === "student" ? this.data?.students[a.cid] : null;
    if (!st) return;
    const stillHere = this.ctx.getWebSockets().some((o) => o !== ws && o.readyState === 1 && o.deserializeAttachment()?.cid === a.cid);
    if (stillHere) return;
    st.lastSeenAt = Date.now();
    this.log({ type: "퇴장", name: st.name });
  }

  dropPosition(ws) {
    const a = ws.deserializeAttachment();
    if (a?.role !== "student") return;
    // 같은 학생이 새 창으로 다시 들어온 경우에는 위치를 지우지 않는다.
    const stillHere = this.ctx.getWebSockets().some((o) => o !== ws && o.readyState === 1 && o.deserializeAttachment()?.cid === a.cid);
    if (!stillHere && this.pos.delete(a.cid)) this.markPositions();
  }

  markPositions() {
    this.posDirty = true;
    this.posIdle = 0;
    if (this.posTimer) return;
    this.posTimer = setInterval(() => {
      if (!this.posDirty) {
        if (++this.posIdle > POS_IDLE_TICKS) { clearInterval(this.posTimer); this.posTimer = null; }
        return;
      }
      this.posDirty = false;
      const list = [];
      for (const [cid, p] of this.pos) {
        const n = this.data?.students[cid]?.n;
        if (n !== undefined) list.push([n, p.x, p.y]);
      }
      const msg = JSON.stringify({ type: "pos", list });
      for (const ws of this.ctx.getWebSockets()) {
        if (ws.deserializeAttachment()?.role) try { ws.send(msg); } catch {}
      }
    }, POS_TICK_MS);
  }

  get practice() { return this.data?.mode === "practice"; }

  // 수업·연습 기록 중 수업 기록만 구글 시트로 보낸다.
  log(row) { if (!this.practice) this.sheet.event(row); }

  // 학생 시작 화면의 '선생님: 탐험 시작' 버튼. 비밀번호는 비밀 값 START_CODES(쉼표로 여러 개).
  async onStartCode(ws, msg) {
    if (this.practice) return;
    const codes = String(this.env.START_CODES ?? "").split(",").map((c) => c.trim()).filter(Boolean);
    if (!codes.length) return this.send(ws, { type: "error", message: "서버에 시작 비밀번호(START_CODES)가 설정되지 않았어요." });
    if (!codes.some((c) => samePassword(String(msg.code ?? ""), c))) return this.send(ws, { type: "error", message: "시작 비밀번호가 맞지 않아요." });
    this.data.stage = "play";
    await this.save();
    this.log({ type: "진행 단계", name: "선생님(시작 비밀번호)", detail: STAGE_NAMES.play });
    this.send(ws, { type: "started" });
    this.scheduleBroadcast();
  }

  async onHello(ws, msg) {
    if (msg.role === "teacher") {
      if (this.practice) return ws.close(4003, "practice room");
      const password = this.env.TEACHER_PASSWORD;
      if (!password) {
        this.send(ws, { type: "error", message: "서버에 교사 비밀번호(TEACHER_PASSWORD)가 설정되지 않았어요. README를 참고해 주세요." });
        return ws.close(4003, "no password set");
      }
      if (!samePassword(msg.password, password)) {
        this.send(ws, { type: "error", message: "비밀번호가 맞지 않아요." });
        return ws.close(4003, "forbidden");
      }
      ws.serializeAttachment({ role: "teacher" });
      this.send(ws, { type: "joined", role: "teacher", answers: ANSWER_TEXT });
      this.send(ws, this.dashboard());
      this.send(ws, this.classState());
      return;
    }
    if (msg.role === "student") {
      const cid = typeof msg.cid === "string" && /^[a-z0-9]{8,32}$/.test(msg.cid) ? msg.cid : null;
      const name = cleanName(msg.name);
      if (!cid || !name) {
        this.send(ws, { type: "error", message: "이름을 입력해 주세요." });
        return ws.close(4001, "bad hello");
      }
      // 연습 유적은 처음 들어온 학생 한 명의 것이다.
      if (this.practice) {
        this.data.owner ??= cid;
        if (this.data.owner !== cid) return ws.close(4003, "not your practice room");
      }
      let st = this.data.students[cid];
      if (!st) {
        if (Object.keys(this.data.students).length >= MAX_STUDENTS) {
          this.send(ws, { type: "error", message: "방 인원이 가득 찼어요." });
          return ws.close(4002, "full");
        }
        // n: 지도 위 캐릭터 번호(색). 위치 메시지를 짧게 하려고 cid 대신 쓴다.
        st = { n: Object.keys(this.data.students).length, name, team: this.pickTeam(), joinedAt: Date.now(), lab: [], probs: {} };
        this.data.students[cid] = st;
      } else {
        st.name = name;
      }
      // 같은 학생이 다른 탭으로 다시 들어오면 이전 연결을 닫는다.
      for (const other of this.ctx.getWebSockets()) {
        const a = other.deserializeAttachment();
        if (other !== ws && a && a.role === "student" && a.cid === cid) {
          try { other.close(4005, "replaced"); } catch {}
        }
      }
      ws.serializeAttachment({ role: "student", cid });
      st.lastSeenAt = Date.now();
      await this.save();
      this.log({ type: "입장", name });
      this.send(ws, { type: "joined", role: "student", name, n: st.n, pos: this.lastPos.get(cid) ?? null });
      this.send(ws, { type: "me", me: st });
      this.send(ws, this.classState());
      this.scheduleBroadcast();
      this.markPositions(); // 새로 들어온 학생도 친구들 위치를 바로 받게 한다
      return;
    }
  }

  async onTeacher(ws, msg) {
    if (msg.type === "stage" && STAGES.includes(msg.stage)) {
      this.data.stage = msg.stage;
      await this.save();
      this.log({ type: "진행 단계", name: "교사", detail: STAGE_NAMES[msg.stage] });
      this.scheduleBroadcast();
    }
    if (msg.type === "reset") {
      // 새 수업: 이전 반의 학생과 기록을 지우고, 접속한 학생은 다시 들어오게 한다.
      this.data = freshData();
      this.pos.clear();
      this.lastPos.clear();
      await this.save();
      this.sheet.newClass();
      for (const other of this.ctx.getWebSockets()) {
        if (other.deserializeAttachment()?.role === "student") try { other.close(4006, "new class"); } catch {}
      }
      this.send(ws, this.dashboard());
      this.scheduleBroadcast();
    }
  }

  async onStudent(ws, cid, msg) {
    const st = this.data.students[cid];
    if (!st) return;

    if (msg.type === "pos") {
      const x = Number(msg.x), y = Number(msg.y), room = Number(msg.room);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const before = this.pos.get(cid)?.room;
      this.pos.set(cid, {
        x: Math.round(Math.min(MAP_W, Math.max(0, x)) * 100) / 100,
        y: Math.round(Math.min(MAP_H, Math.max(0, y)) * 100) / 100,
        room: Number.isInteger(room) && room >= 0 && room < ROOM_COUNT ? room : 0,
      });
      this.lastPos.set(cid, this.pos.get(cid));
      this.markPositions();
      if (before !== this.pos.get(cid).room) this.scheduleBroadcast(); // 교사 화면의 '위치' 칸
      return;
    }

    if (msg.type === "lab" && LAB_LEVELS.includes(msg.level)) {
      if (this.data.stage !== "play") return;
      if (!st.lab.includes(msg.level)) {
        st.lab.push(msg.level);
        st.lastAt = Date.now();
        await this.save();
        this.log({ type: "벡터 점프", name: st.name, detail: LAB_NAMES[msg.level] });
        this.scheduleBroadcast();
      }
      this.send(ws, { type: "me", me: st });
      return;
    }

    if (msg.type === "restart" && this.practice) {
      // 연습 모드 '처음부터 다시': 내 기록만 지우고 이름은 남긴다.
      Object.assign(st, { lab: [], probs: {}, lastAt: undefined, escapedAt: undefined });
      this.data.unlocked = [];
      this.lastPos.delete(cid);
      await this.save();
      this.send(ws, { type: "restarted" });
      return;
    }

    if (msg.type === "review") {
      // 탐험이 끝난 뒤 오답 정리용으로 정답표를 내려 준다. 수업 중에는 정답이 학생에게 가지 않는다.
      if (this.data.stage !== "done" && !(this.practice && st.escapedAt)) return;
      return this.send(ws, { type: "review", answers: ANSWER_TEXT });
    }

    if (msg.type === "hint" && PROBLEM_IDS.includes(msg.pid)) {
      // 힌트를 본 기록. 힌트를 보고 맞히면 첫 시도 보너스는 주지 않는다.
      const p = (st.probs[msg.pid] ??= { tries: 0, solved: false, firstTry: false, wrongs: [] });
      if (!p.hinted && !p.solved) {
        p.hinted = true;
        await this.save();
        this.log({ type: "힌트", name: st.name, problem: problemName(msg.pid) });
        this.scheduleBroadcast();
      }
      return;
    }

    if (msg.type === "submit") {
      if (this.data.stage !== "play") return this.send(ws, { type: "error", message: "선생님이 탐험을 시작하면 열 수 있어요." });
      if (!PROBLEM_IDS.includes(msg.pid)) return;
      const p = (st.probs[msg.pid] ??= { tries: 0, solved: false, firstTry: false, wrongs: [] });
      if (p.solved) return this.send(ws, { type: "result", pid: msg.pid, ok: true, tries: p.tries, already: true });
      if (p.tries >= MAX_TRIES) return this.send(ws, { type: "error", message: "도전 횟수를 다 썼어요. 선생님께 도움을 요청하세요." });
      const result = checkAnswer(msg.pid, msg.answer);
      if (!result) return this.send(ws, { type: "result", pid: msg.pid, invalid: true, tries: p.tries });
      p.tries += 1;
      if (result.ok) {
        p.solved = true;
        p.firstTry = p.tries === 1 && !p.hinted;
        p.solvedAt = st.lastAt = Date.now();
        if (Object.values(st.probs).filter((x) => x.solved).length === PROBLEM_IDS.length) st.escapedAt = p.solvedAt;
        this.updateUnlocks();
      } else if (p.wrongs.length < 10) {
        p.wrongs.push(result.display);
      }
      await this.save();
      this.log({ type: result.ok ? "정답" : "오답", name: st.name, problem: problemName(msg.pid), answer: result.display, result: result.ok ? "O" : "X", tries: p.tries });
      if (result.ok && st.escapedAt === p.solvedAt) this.log({ type: "탈출", name: st.name, detail: "열쇠 조각 7개를 모두 모았어요" });
      this.send(ws, { type: "result", pid: msg.pid, ok: result.ok, tries: p.tries });
      this.send(ws, { type: "me", me: st });
      if (result.ok) this.broadcast({ type: "found", n: st.n, name: st.name, pid: msg.pid }); // 모두에게 "누가 유물을 발견했어요" 팝업
      this.scheduleBroadcast();
    }
  }

  // 팀전: 팀별로 점수(문제 해결 + 첫 시도 보너스 + 벡터 점프)를 합산한다.
  pickTeam() {
    const count = {};
    for (const st of Object.values(this.data.students)) count[st.team] = (count[st.team] ?? 0) + 1;
    return TEAMS.reduce((best, t) => ((count[best] ?? 0) <= (count[t] ?? 0) ? best : t));
  }

  teamScores() {
    const rows = this.ranking();
    return TEAMS.map((team) => {
      const members = rows.filter((r) => this.data.students[r.cid].team === team);
      return {
        team, name: TEAM_NAMES[team], members: members.length,
        score: members.reduce((s, r) => s + r.score, 0),
        solved: members.reduce((s, r) => s + r.solved, 0),
        escaped: members.some((r) => r.escapedAt),
      };
    })
      .filter((t) => t.members > 0)
      .sort((a, b) => b.score - a.score)
      .map((t, i) => ({ ...t, rank: i + 1 }));
  }

  needCount() {
    const total = Object.keys(this.data.students).length;
    return Math.max(1, Math.ceil(total * UNLOCK_RATIO));
  }

  solvedCount(pid) {
    let n = 0;
    for (const st of Object.values(this.data.students)) if (st.probs[pid]?.solved) n++;
    return n;
  }

  updateUnlocks() {
    const need = this.needCount();
    for (const pid of PROBLEM_IDS) {
      if (!this.data.unlocked.includes(pid) && this.solvedCount(pid) >= need) this.data.unlocked.push(pid);
    }
  }

  // 점수: 문제 100점, 첫 시도 정답 50점 더, 벡터 점프 20점. 같으면 먼저 도달한 학생이 앞선다.
  ranking() {
    return Object.entries(this.data.students)
      .map(([cid, st]) => {
        const probs = Object.values(st.probs);
        const solved = probs.filter((p) => p.solved).length;
        const first = probs.filter((p) => p.firstTry).length;
        return {
          cid, n: st.n, name: st.name, solved, first, lab: st.lab.length,
          score: solved * SCORE.solve + first * SCORE.firstTry + st.lab.length * SCORE.jump,
          lastAt: st.lastAt ?? Infinity, escapedAt: st.escapedAt ?? null,
        };
      })
      .sort((a, b) => b.score - a.score || a.lastAt - b.lastAt)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }

  // 구글 시트 '학생별 요약'에 보낼 행
  sheetSummaries() {
    const online = this.onlineCids();
    const iso = (ms) => (ms ? new Date(ms).toISOString() : "");
    return this.ranking().map((r) => {
      const st = this.data.students[r.cid];
      return {
        id: r.cid, rank: r.rank, name: st.name, score: r.score, solved: r.solved, lab: r.lab,
        hints: Object.values(st.probs).filter((p) => p.hinted).length,
        firstJoin: iso(st.joinedAt), lastSeen: iso(online.has(r.cid) ? Date.now() : st.lastSeenAt), escapedAt: iso(st.escapedAt),
        online: online.has(r.cid),
      };
    });
  }

  broadcast(msg) {
    const s = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.deserializeAttachment()?.role) try { ws.send(s); } catch {}
    }
  }

  onlineCids() {
    const set = new Set();
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.role === "student" && ws.readyState === 1) set.add(a.cid);
    }
    return set;
  }

  classState() {
    const students = Object.values(this.data.students);
    const total = students.length;
    const labDone = students.reduce((n, st) => n + st.lab.length, 0);
    const need = this.needCount();
    const relics = {};
    for (const pid of PROBLEM_IDS) {
      relics[pid] = { solved: this.solvedCount(pid), need, unlocked: this.data.unlocked.includes(pid) };
    }
    return {
      type: "class",
      stage: this.data.stage,
      total,
      online: this.onlineCids().size,
      energy: total ? labDone / (total * LAB_LEVELS.length) : 0,
      relics,
      players: students.map((st) => [st.n, st.name, st.team ?? null]),
      ranking: this.ranking().map(({ n, name, score, solved, escapedAt, cid }) => ({ n, name, score, solved, escaped: !!escapedAt, team: this.data.students[cid].team ?? null })),
      teams: this.teamScores(),
    };
  }

  dashboard() {
    const online = this.onlineCids();
    const students = this.ranking().map((r) => {
      const st = this.data.students[r.cid];
      return {
        cid: r.cid, name: st.name, online: online.has(r.cid), lab: st.lab.length, probs: st.probs, team: st.team ?? null,
        joinedAt: st.joinedAt, escapedAt: st.escapedAt ?? null, rank: r.rank, score: r.score,
        room: this.pos.get(r.cid)?.room ?? null,
      };
    });
    const stats = {};
    for (const pid of PROBLEM_IDS) {
      let tried = 0, solved = 0, first = 0;
      const wrongCount = {};
      for (const st of Object.values(this.data.students)) {
        const p = st.probs[pid];
        if (!p || p.tries === 0) continue;
        tried++;
        if (p.solved) solved++;
        if (p.firstTry) first++;
        for (const w of p.wrongs) wrongCount[w] = (wrongCount[w] ?? 0) + 1;
      }
      const topWrong = Object.entries(wrongCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
      stats[pid] = { tried, solved, first, topWrong };
    }
    return { type: "dashboard", stage: this.data.stage, labLevels: LAB_LEVELS.length, students, stats, teams: this.teamScores() };
  }

  // 여러 학생이 동시에 제출해도 0.2초에 한 번만 모두에게 보낸다.
  scheduleBroadcast() {
    if (this.pending) return;
    this.pending = setTimeout(() => {
      this.pending = null;
      if (!this.data) return;
      const cls = JSON.stringify(this.classState());
      let dash = null;
      for (const ws of this.ctx.getWebSockets()) {
        const a = ws.deserializeAttachment();
        if (!a || !a.role) continue;
        try {
          ws.send(cls);
          if (a.role === "teacher") ws.send((dash ??= JSON.stringify(this.dashboard())));
        } catch {}
      }
    }, 200);
  }
}
