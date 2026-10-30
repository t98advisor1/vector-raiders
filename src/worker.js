// 진입점: /ws 연결을 유적(Durable Object)으로 넘긴다. 그 밖의 경로는 public/ 정적 파일이 처리한다.
//   /ws                         → 수업 유적 하나 (반 전체가 함께, 방 코드 없음)
//   /ws?mode=practice&cid=...   → 학생마다 따로 있는 연습 유적
export { Room } from "./room.js";

const CID_RE = /^[a-z0-9]{8,32}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/ws") return new Response("not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });

    if (url.searchParams.get("mode") === "practice") {
      const cid = url.searchParams.get("cid") ?? "";
      if (!CID_RE.test(cid)) return new Response("bad id", { status: 400 });
      const forwarded = new Request(request);
      forwarded.headers.set("X-Room-Mode", "practice");
      return env.ROOM.get(env.ROOM.idFromName(`practice:${cid}`)).fetch(forwarded);
    }
    return env.ROOM.get(env.ROOM.idFromName("main")).fetch(request);
  },
};
