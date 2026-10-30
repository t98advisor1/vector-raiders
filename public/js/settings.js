// 학생 기기마다 기억하는 설정: 배경음, 효과음, 그래픽 품질. 메뉴의 '설정' 카드에서 바꾼다.
const KEY = "vr-settings";
const DEFAULTS = { music: true, sfx: true, quality: "high" };

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    // 예전 버전의 '소리 끔' 기억도 이어받는다.
    if (!saved && localStorage.getItem("vr-sound") === "off") return { ...DEFAULTS, music: false, sfx: false };
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings = read();
const listeners = new Set();

export function updateSettings(patch) {
  Object.assign(settings, patch);
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
  for (const f of listeners) f(settings);
}

export function onSettings(f) {
  listeners.add(f);
  f(settings);
}
