// 학생 봇 N명이 동시에 접속해 돌아다니며 벡터 점프와 상자 문제를 진행하는 부하 시험.
// 사용법: node scripts/loadtest.mjs [서버 주소] [학생 수]
//   예) node scripts/loadtest.mjs http://127.0.0.1:8787 28
// 교사 비밀번호는 환경 변수 TEACHER_PASSWORD 또는 .dev.vars에서 읽는다.
// 주의: 시작할 때 '새 수업 시작'을 눌러 유적의 기록을 지운다. 수업 중인 서버에는 쓰지 않는다.
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://127.0.0.1:8787";
const N = Number(process.argv[3] ?? 28);
const wsUrl = `${base.replace(/^http/, "ws")}/ws`;
const password = process.env.TEACHER_PASSWORD
  ?? readFileSync(".dev.vars", "utf8").match(/^TEACHER_PASSWORD=(.*)$/m)?.[1]?.trim();
if (!password) throw new Error("TEACHER_PASSWORD를 찾지 못했어요.");

const RIGHT = { p1: ["AO", "OD", "FE"], p2: "4", p3: "1/2", p4: "m=1", p5: "2", p6: "-4", p7: "π/2" };
const WRONG = { p1: ["AO", "OD"], p2: "2√5", p3: "√3/4", p4: "-1", p5: "1", p6: "4", p7: "π/3" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function open(hello) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const inbox = [];
    const waiters = [];
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      const i = waiters.findIndex((w) => w.pred(msg));
      if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
      else inbox.push(msg);
    };
    ws.onopen = () => { ws.send(JSON.stringify(hello)); resolve(client); };
    ws.onerror = reject;
    const client = {
      ws,
      send: (m) => ws.send(JSON.stringify(m)),
      latest: (pred) => inbox.filter(pred).at(-1) ?? null,
      wait(pred, ms = 5000) {
        const i = inbox.findIndex(pred);
        if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
        return new Promise((res, rej) => {
          const t = setTimeout(() => rej(new Error(`응답을 기다리다 시간 초과: ${pred}`)), ms);
          waiters.push({ pred, resolve: (m) => { clearTimeout(t); res(m); } });
        });
      },
    };
  });
}

const t0 = performance.now();
const teacher = await open({ type: "hello", role: "teacher", password });
await teacher.wait((m) => m.type === "joined");
teacher.send({ type: "reset" });
await teacher.wait((m) => m.type === "dashboard" && m.students.length === 0);
console.log("교사 로그인, 새 수업 시작");

const students = await Promise.all(
  Array.from({ length: N }, (_, i) =>
    open({ type: "hello", role: "student", cid: `bot${String(i).padStart(6, "0")}`, name: `${i + 1}번 봇` })),
);
await Promise.all(students.map((s) => s.wait((m) => m.type === "joined")));
console.log(`학생 ${N}명 입장 (${Math.round(performance.now() - t0)}ms)`);

teacher.send({ type: "stage", stage: "play" });
await sleep(300);
// 탐험하는 동안 0.12초마다 위치를 보낸다.
const walking = setInterval(() => {
  students.forEach((s, i) => s.send({ type: "pos", x: 2 + (i % 10) + Math.random(), y: 2 + Math.random() * 8, room: 0 }));
}, 120);
await Promise.all(students.map(async (s) => {
  for (const level of ["l1", "l2", "l3", "l4", "l5"]) { s.send({ type: "lab", level }); await sleep(20); }
}));
const posMsg = await students[0].wait((m) => m.type === "pos" && m.list.length === N, 5000);
console.log(`위치 공유: 한 학생이 친구 ${posMsg.list.length}명의 위치를 받음`);
const latencies = [];
let wrongAnswers = 0;
await Promise.all(students.map(async (s, i) => {
  for (const pid of Object.keys(RIGHT)) {
    // 학생마다 몇 문제는 한 번 틀리게 한다.
    if ((i + pid.charCodeAt(1)) % 3 === 0) {
      const t = performance.now();
      s.send({ type: "submit", pid, answer: WRONG[pid] });
      const r = await s.wait((m) => m.type === "result" && m.pid === pid);
      latencies.push(performance.now() - t);
      if (r.ok) throw new Error(`${pid} 오답이 정답 처리됨`);
      wrongAnswers++;
    }
    const t = performance.now();
    s.send({ type: "submit", pid, answer: RIGHT[pid] });
    const r = await s.wait((m) => m.type === "result" && m.pid === pid);
    latencies.push(performance.now() - t);
    if (!r.ok) throw new Error(`${pid} 정답이 오답 처리됨`);
  }
}));

clearInterval(walking);
await sleep(500);
const dash = await teacher.wait((m) => m.type === "dashboard" && m.students.length === N && Object.values(m.stats).every((s) => s.solved === N), 5000);
await sleep(500);
const cls = teacher.latest((m) => m.type === "class");
latencies.sort((a, b) => a - b);
const pct = (q) => Math.round(latencies[Math.floor(q * (latencies.length - 1))]);
console.log(`제출 ${latencies.length}건 (오답 ${wrongAnswers}건) · 응답 시간 중앙값 ${pct(0.5)}ms, 95% ${pct(0.95)}ms, 최대 ${pct(1)}ms`);
const latestDash = teacher.latest((m) => m.type === "dashboard") ?? dash;
console.log(`교사 화면: 학생 ${dash.students.length}명, 접속 중 ${latestDash.students.filter((s) => s.online).length}명, 문제별 정답 ${Object.values(dash.stats).map((s) => s.solved).join("/")}`);
console.log(`자주 나온 오답 예: p2 → ${JSON.stringify(dash.stats.p2.topWrong)}`);
if (cls) console.log(`실험실 에너지 ${Math.round(cls.energy * 100)}% · 깨어난 유물 ${Object.values(cls.relics).filter((r) => r.unlocked).length}/7`);
console.log(`전체 ${Math.round(performance.now() - t0)}ms`);
for (const s of students) s.ws.close();
teacher.ws.close();
