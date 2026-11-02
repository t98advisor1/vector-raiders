// 진입점: /ws 연결을 유적(Durable Object)으로 넘긴다. 그 밖의 경로는 public/ 정적 파일이 처리한다.
//   /ws?ch=1 ~ /ws?ch=6         → 팀전 채널 1~6 (A·B·C 세 팀, 선생님이 시작)
//   /ws?ch=s1 ~ /ws?ch=s6       → 개인전 채널 1~6 (8명이 겨룬다, 먼저 들어온 학생이 방장)
//   /ws?mode=practice&cid=...   → 학생마다 따로 있는 연습 유적
// 모든 방은 열린 뒤 60분이 지나면 끝나고 기록이 초기화된다 (src/room.js).
export { Room } from "./room.js";

const CID_RE = /^[a-z0-9]{8,32}$/;
const CH_RE = /^([1-6]|s[1-6])$/; // 팀전 1~6, 개인전 s1~s6
const TEAM_CH_RE = /^[1-6]$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 실시간 방문자 집계 API (오늘/누적/현재 접속자)
    if (url.pathname === "/api/stats") {
      return env.ROOM.get(env.ROOM.idFromName("stats:global")).fetch(request);
    }

    // 연습 모드에서 고를 수 있는 세트: 그 팀전 채널의 수업 세트 + 기본 세트 목록
    if (url.pathname === "/api/practice-sets") {
      const ch = TEAM_CH_RE.test(url.searchParams.get("ch") ?? "") ? url.searchParams.get("ch") : "1";
      const forwarded = new Request(request);
      forwarded.headers.set("X-Channel", ch);
      return env.ROOM.get(env.ROOM.idFromName(`class:${ch}`)).fetch(forwarded);
    }

    if (url.pathname !== "/ws") return new Response("not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });

    if (url.searchParams.get("mode") === "practice") {
      const cid = url.searchParams.get("cid") ?? "";
      if (!CID_RE.test(cid)) return new Response("bad id", { status: 400 });
      const forwarded = new Request(request);
      forwarded.headers.set("X-Room-Mode", "practice");
      return env.ROOM.get(env.ROOM.idFromName(`practice:${cid}`)).fetch(forwarded);
    }
    // 수업 채널: ch(또는 channel) 파라미터로 고른다. 없거나 잘못되면 팀전 1채널.
    const raw = url.searchParams.get("ch") ?? url.searchParams.get("channel") ?? "1";
    const ch = CH_RE.test(raw) ? raw : "1";
    const forwarded = new Request(request);
    forwarded.headers.set("X-Channel", ch);
    return env.ROOM.get(env.ROOM.idFromName(`class:${ch}`)).fetch(forwarded);
  },
};
