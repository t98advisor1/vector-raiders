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
