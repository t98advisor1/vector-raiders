// 교사 비밀번호는 공개 저장소에 적지 않고 Cloudflare 비밀 값으로만 받는다.
//   TEACHER_PASSWORD   전체 관리자 비밀번호: 모든 채널 교사 화면에 들어간다
//   CHANNEL_PASSWORDS  채널별 비밀번호, 예: "1=1111,1112;2=2222;3=3333"
//                      (채널=비밀번호를 세미콜론으로 나누고, 한 채널에 여럿이면 쉼표로)
// 아무것도 설정하지 않으면 교사 화면에 들어갈 수 없다(기본 비밀번호는 없다).

// 길이가 같으면 글자마다 모두 비교한다.
export function samePassword(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// 12-34, " 1234 "처럼 하이픈·띄어쓰기를 넣어도 같은 비밀번호로 본다.
const normalize = (s) => String(s ?? "").replace(/[-\s]/g, "");

export function parseChannelPasswords(raw) {
  const map = new Map();
  for (const part of String(raw ?? "").split(";")) {
    const [ch, list] = part.split("=");
    if (!ch?.trim() || !list) continue;
    const pws = list.split(",").map(normalize).filter(Boolean);
    if (pws.length) map.set(ch.trim(), pws);
  }
  return map;
}

// 결과: "ok"(맞음), "wrong"(틀림), "unset"(이 채널에 쓸 비밀번호가 하나도 설정되지 않음)
export function checkTeacherPassword(env, channel, entered) {
  const allowed = [
    ...(env.TEACHER_PASSWORD ? [normalize(env.TEACHER_PASSWORD)] : []),
    ...(parseChannelPasswords(env.CHANNEL_PASSWORDS).get(String(channel)) ?? []),
  ].filter(Boolean);
  if (!allowed.length) return "unset";
  const typed = normalize(entered);
  return allowed.some((p) => samePassword(typed, p)) ? "ok" : "wrong";
}

// ---------- 전체 관리자가 교사 화면에서 바꾸는 중간관리자(채널) 설정 ----------
// 저장 형태(채널마다): { passwords: ["1234"], from: "2026-11-01", until: "2027-02-28" }
//   passwords가 있으면 그 채널은 비밀 값 CHANNEL_PASSWORDS 대신 이 비밀번호를 쓴다.
//   from·until(한국 날짜, 그날 포함)이 있으면 그 기간에만 중간관리자 로그인과 수업 참가가 된다.
//   전체 관리자(TEACHER_PASSWORD)는 기간과 상관없이 늘 들어간다.

// 한국 시간 기준 오늘 날짜 "YYYY-MM-DD"
export const todayKst = (now = Date.now()) => new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const cleanDate = (s) => (typeof s === "string" && DATE_RE.test(s) && !Number.isNaN(Date.parse(s)) ? s : "");

// 사용 기간 상태: "ok"(기간 안이거나 기간 없음), "notyet"(시작 전), "expired"(끝남)
export function periodStatus(cfg, today = todayKst()) {
  if (cfg?.from && today < cfg.from) return "notyet";
  if (cfg?.until && today > cfg.until) return "expired";
  return "ok";
}

// 비밀번호 목록 정리: 쉼표로 여러 개, 하이픈·띄어쓰기 무시, 4~32자
export function cleanPasswordList(raw) {
  const list = String(raw ?? "").split(",").map(normalize).filter(Boolean);
  if (!list.length) return { ok: false, message: "비밀번호를 입력해 주세요." };
  if (list.some((p) => p.length < 4 || p.length > 32)) return { ok: false, message: "비밀번호는 4~32자로 정해 주세요." };
  if (list.some((p) => /[;=]/.test(p))) return { ok: false, message: "비밀번호에 ; 와 = 는 쓸 수 없어요." };
  return { ok: true, list: [...new Set(list)] };
}

export const isMasterPassword = (env, entered) =>
  !!env.TEACHER_PASSWORD && samePassword(normalize(entered), normalize(env.TEACHER_PASSWORD));

// 교사 로그인 판정. overrides: 전체 관리자가 저장한 채널 설정 { "1": {...}, ... }
// 결과: { result: "ok" | "wrong" | "unset" | "notyet" | "expired", master: bool, cfg }
export function checkTeacherAccess(env, channel, entered, overrides = {}, today = todayKst()) {
  if (isMasterPassword(env, entered)) return { result: "ok", master: true };
  const ch = String(channel);
  const cfg = overrides?.[ch] ?? null;
  const channelPws = cfg?.passwords?.length ? cfg.passwords : (parseChannelPasswords(env.CHANNEL_PASSWORDS).get(ch) ?? []);
  if (!env.TEACHER_PASSWORD && !channelPws.length) return { result: "unset", master: false };
  const typed = normalize(entered);
  if (!channelPws.some((p) => samePassword(typed, p))) return { result: "wrong", master: false };
  const period = periodStatus(cfg, today);
  return { result: period === "ok" ? "ok" : period, master: false, cfg };
}
