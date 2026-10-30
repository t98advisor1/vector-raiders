// 가상 학생 여러 명이 동시에 유적을 탐험하며 문제를 푸는 시뮬레이션.
// 학생마다 실력(정답 확률)과 속도가 달라 랭킹이 갈린다. 끝나면 랭킹을 출력하고 results/에 CSV로 남긴다.
//
// 사용법: node scripts/simulate.mjs [서버 주소] [인원] [빠르기]
//   예) node scripts/simulate.mjs http://127.0.0.1:8787 5 3
// 교사 비밀번호는 환경 변수 TEACHER_PASSWORD 또는 .dev.vars에서 읽는다.
// 주의: 시작할 때 '새 수업 시작'을 눌러 기록을 지운다(--keep을 붙이면 지우지 않는다). 수업 중인 서버에는 쓰지 않는다.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const keep = process.argv.includes("--keep");
const base = args[0] ?? "http://127.0.0.1:8787";
const N = Number(args[1] ?? 5);
const SPEED = Number(args[2] ?? 3); // 1이면 실제 학생 속도, 클수록 빨리 끝난다
const wsUrl = `${base.replace(/^http/, "ws")}/ws`;
const password = process.env.TEACHER_PASSWORD
  ?? readFileSync(".dev.vars", "utf8").match(/^TEACHER_PASSWORD=(.*)$/m)?.[1]?.trim();
if (!password) throw new Error("TEACHER_PASSWORD를 찾지 못했어요.");

const RIGHT = { p1: ["AO", "OD", "FE"], p2: "4", p3: "1/2", p4: "1", p5: "2", p6: "-4", p7: "π/2" };
// 학생들이 실제로 낼 법한 오답
const WRONG = {
  p1: [["AO", "OD"], ["AO", "OD", "FE", "CO"], ["FE", "EF"]],
  p2: ["2√5", "2", "√5"],
  p3: ["√3/4", "1", "-1/2"],
  p4: ["-1", "3", "-3"],
  p5: ["1", "5", "3"],
  p6: ["4", "-2", "2"],
  p7: ["π/3", "π", "2π"],
};
const NAMES = ["민준", "서연", "도윤", "하은", "지호", "수아", "예준", "지유", "시우", "하린"];

// 지도 위 경로: ["move", x, y] | ["lab", id] | ["solve", pid]  (지도 좌표는 public/js/game.js와 같다)
const ROUTE = [
  ["move", 4.5, 4.4], ["solve", "p1"],
  ["move", 4.5, 8.6], ["solve", "p2"],
  ["move", 8.4, 7.0], ["lab", "l1"], ["move", 11.6, 7.0],
  ["move", 12.5, 7.7], ["solve", "p3"],
  ["move", 15.5, 6.5], ["move", 18.0, 6.5],
  ["move", 19.4, 4.0], ["lab", "l2"], ["move", 22.6, 4.0],
  ["move", 24.5, 8.4], ["solve", "p4"],
  ["move", 25.4, 9.0], ["lab", "l3"], ["move", 28.6, 9.0],
  ["move", 29.5, 4.4], ["solve", "p5"],
  ["move", 31.5, 6.5], ["move", 34.0, 6.5],
  ["move", 35.4, 5.0], ["lab", "l4"], ["move", 38.6, 5.0],
  ["move", 39.5, 4.4], ["solve", "p6"],
  ["move", 41.4, 8.0], ["lab", "l5"], ["move", 44.6, 8.0],
  ["move", 45.5, 8.4], ["solve", "p7"],
  ["move", 47.5, 6.5], ["move", 52.5, 7.6],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

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
      if (inbox.length > 200) inbox.splice(0, 100);
    };
    ws.onopen = () => { ws.send(JSON.stringify(hello)); resolve(client); };
    ws.onerror = reject;
    const client = {
      ws,
      send: (m) => ws.send(JSON.stringify(m)),
      latest: (pred) => inbox.filter(pred).at(-1) ?? null,
      wait(pred, ms = 8000) {
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

async function student(i) {
  // 실력: 첫 시도에 맞힐 확률. 빠르기: 걷기·생각하는 시간 배율
  const skill = rand(0.35, 0.95);
  const pace = rand(0.7, 1.4);
  const name = `🤖${NAMES[i % NAMES.length]}`;
  const s = await open({ type: "hello", role: "student", cid: `sim${String(i).padStart(5, "0")}x`, name });
  await s.wait((m) => m.type === "joined");
  const me = { x: 2.5, y: 6.5 };
  const log = { name, skill, pace, tries: 0, wrong: 0 };

  const walk = async (x, y) => {
    const dist = Math.hypot(x - me.x, y - me.y);
    const steps = Math.max(1, Math.round(dist / 0.5));
    const sx = (x - me.x) / steps, sy = (y - me.y) / steps;
    for (let k = 0; k < steps; k++) {
      me.x += sx; me.y += sy;
      s.send({ type: "pos", x: me.x, y: me.y, room: me.x < 16 ? 0 : me.x < 32 ? 1 : me.x < 48 ? 2 : 3 });
      await sleep((0.5 / 4.2) * 1000 * pace); // 초당 4.2칸
    }
  };

  for (const [kind, a, b] of ROUTE) {
    if (kind === "move") await walk(a, b);
    if (kind === "lab") {
      await sleep(rand(3000, 9000) * pace); // 벡터를 끌어 맞추는 시간
      s.send({ type: "lab", level: a });
    }
    if (kind === "solve") {
      for (let attempt = 1; ; attempt++) {
        await sleep(rand(5000, 15000) * pace); // 문제를 읽고 생각하는 시간
        const right = Math.random() < Math.min(0.98, skill + (attempt - 1) * 0.2); // 힌트를 보며 점점 맞힌다
        s.send({ type: "submit", pid: a, answer: right ? RIGHT[a] : pick(WRONG[a]) });
        const r = await s.wait((m) => m.type === "result" && m.pid === a);
        log.tries++;
        if (r.ok) break;
        log.wrong++;
      }
    }
  }
  return { s, log };
}

const t0 = Date.now();
const teacher = await open({ type: "hello", role: "teacher", password });
await teacher.wait((m) => m.type === "joined");
if (!keep) {
  teacher.send({ type: "reset" });
  await teacher.wait((m) => m.type === "dashboard" && m.students.length === 0);
}
teacher.send({ type: "stage", stage: "play" });
console.log(`가상 학생 ${N}명이 동시에 탐험을 시작해요 (빠르기 ${SPEED}배)…`);

const progress = setInterval(() => {
  const cls = teacher.latest((m) => m.type === "class");
  if (!cls) return;
  const top = (cls.ranking ?? []).slice(0, 3).map((r) => `${r.name} ${r.score}점`).join(" · ");
  console.log(`  ${Math.round((Date.now() - t0) / 1000)}초 | 깨어난 유물 ${Object.values(cls.relics).filter((r) => r.unlocked).length}/7 | ${top}`);
}, 10000);

const results = await Promise.all(Array.from({ length: N }, (_, i) => student(i)));
clearInterval(progress);
await new Promise((r) => setTimeout(r, 600));
const dash = teacher.latest((m) => m.type === "dashboard");
const cls = teacher.latest((m) => m.type === "class");

const clock = (ms) => (ms ? new Date(ms).toLocaleTimeString("ko-KR", { hour12: false }) : "");
const pids = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
console.log(`\n탐험 끝 (${Math.round((Date.now() - t0) / 1000)}초) · 깨어난 유물 ${Object.values(cls.relics).filter((r) => r.unlocked).length}/7\n`);
console.log("순위  이름        점수  들어온 시각  탈출 시각  문제별 시도 횟수(1~7)");
for (const st of dash.students) {
  const tries = pids.map((p) => st.probs[p]?.tries ?? 0).join(" ");
  console.log(`${String(st.rank).padStart(3)}  ${st.name.padEnd(8)}  ${String(st.score).padStart(4)}  ${clock(st.joinedAt).padEnd(11)}  ${clock(st.escapedAt).padEnd(9)}  ${tries}`);
}
console.log("\n가상 학생 설정 (실력 = 첫 시도에 맞힐 확률)");
for (const { log } of results) console.log(`  ${log.name}: 실력 ${Math.round(log.skill * 100)}%, 속도 배율 ${log.pace.toFixed(2)}, 제출 ${log.tries}번 중 오답 ${log.wrong}번`);

mkdirSync("results", { recursive: true });
const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
const head = ["순위", "이름", "점수", "들어온 시각", "탈출 시각", "벡터 점프", ...pids.map((p) => `${p} 결과`), ...pids.map((p) => `${p} 오답`)];
const rows = dash.students.map((st) => [
  st.rank, st.name, st.score, clock(st.joinedAt), clock(st.escapedAt), st.lab,
  ...pids.map((p) => { const r = st.probs[p]; return !r ? "미응시" : r.solved ? `정답(${r.tries}회)` : `오답(${r.tries}회)`; }),
  ...pids.map((p) => (st.probs[p]?.wrongs ?? []).join(" / ")),
]);
const now = new Date();
const stamp = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()].map((v) => String(v).padStart(2, "0")).join("-");
const file = `results/simulation-${stamp}.csv`; // 이 컴퓨터의 시각으로 이름을 붙인다
writeFileSync(file, "﻿" + [head, ...rows].map((r) => r.map(q).join(",")).join("\r\n"));
console.log(`\n기록을 ${file}에 저장했어요.`);

for (const { s } of results) s.ws.close();
teacher.ws.close();
