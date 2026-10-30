// 유적 WebSocket 연결. 끊기면 자동으로 다시 연결하고, 다시 연결될 때마다 hello를 보낸다.
const FINAL_CODES = new Set([4000, 4001, 4002, 4003, 4005, 4006]);

// query: 연습 유적이면 "?mode=practice&cid=..."
export function connect(hello, onMessage, onStatus = () => {}, query = "") {
  let ws = null, stopped = false, delay = 1000;
  const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws${query}`;

  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => {
      delay = 1000;
      ws.send(JSON.stringify(hello()));
      onStatus("open");
    };
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      onMessage(msg);
    };
    ws.onclose = (e) => {
      if (stopped) return;
      if (FINAL_CODES.has(e.code)) return onStatus("final", e.code);
      onStatus("retry");
      setTimeout(open, delay);
      delay = Math.min(delay * 2, 8000);
    };
  };
  open();

  return {
    send(msg) {
      if (ws && ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify(msg)); return true; }
      return false;
    },
    close() { stopped = true; ws?.close(1000); },
  };
}

export function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key) ?? "null");
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return null;
  }
}
