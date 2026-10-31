// 진입점: /ws 연결을 유적(Durable Object)으로 넘긴다. 그 밖의 경로는 public/ 정적 파일이 처리한다.
//   /ws                         → 1채널 수업 유적 (반 전체가 함께, 방 코드 없음)
//   /ws?ch=2                    → 2채널 수업 유적 (1~5채널: 완전히 분리된 수업 세션)
//   /ws?mode=practice&cid=...   → 학생마다 따로 있는 연습 유적
export { Room } from "./room.js";

const CID_RE = /^[a-z0-9]{8,32}$/;
const CH_RE = /^[1-5]$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 실시간 방문자 집계 API (오늘/누적/현재 접속자)
    if (url.pathname === "/api/stats") {
      return env.ROOM.get(env.ROOM.idFromName("stats:global")).fetch(request);
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
    // 수업 채널: ch(또는 channel) 파라미터로 1~5채널을 고른다. 없으면 1채널.
    const raw = url.searchParams.get("ch") ?? url.searchParams.get("channel") ?? "1";
    const ch = CH_RE.test(raw) ? raw : "1";
    return env.ROOM.get(env.ROOM.idFromName(`class:${ch}`)).fetch(request);
  },
};
