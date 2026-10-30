// 진입점: /ws 연결을 유적(Durable Object 하나)으로 넘긴다. 방 코드 없이 모두 같은 유적에 들어온다.
// 그 밖의 경로는 public/ 정적 파일이 처리한다.
export { Room } from "./room.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
      return env.ROOM.get(env.ROOM.idFromName("main")).fetch(request);
    }
    return new Response("not found", { status: 404 });
  },
};
