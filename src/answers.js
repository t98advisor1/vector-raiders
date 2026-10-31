// 채점: 문항 세트(md)의 정답으로 학생 답을 채점한다. 정답은 서버에만 있고 학생 화면에는 보내지 않는다.
// 답 형식: num(숫자·수식) / choice(오지선다 번호) / set(보기에서 모두 고르기) / vec(벡터식, 예: -a+2b)
import { evaluate } from "./mathexpr.js";
import { parseVecExpr } from "./setfile.js";

const EPS = 1e-6;
const CIRCLED = { "①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5" };
const norm = (s) => String(s ?? "").replace(/[①②③④⑤]/g, (c) => CIRCLED[c]).replace(/\s/g, "");

// 반환값: { ok, display } 또는 형식이 잘못되면 null
export function gradeLevel(lv, answer) {
  if (!lv) return null;
  if (lv.kind === "set") {
    if (!Array.isArray(answer) || answer.length > 12) return null;
    const picked = [...new Set(answer.filter((x) => typeof x === "string" && x.length <= 12).map((x) => x.trim()))].sort();
    if (!picked.length) return null;
    const want = lv.answer.split(",").map((s) => s.trim()).filter(Boolean).sort();
    return { ok: picked.length === want.length && picked.every((x, i) => x === want[i]), display: picked.join(", ") };
  }
  const raw = String(answer ?? "").trim();
  if (!raw || raw.length > 60) return null;
  if (lv.kind === "choice") return { ok: norm(raw) === norm(lv.answer).match(/^\d/)?.[0], display: raw };
  if (lv.kind === "vec") {
    const got = parseVecExpr(raw), want = parseVecExpr(lv.answer);
    if (!got || !want) return null;
    // 정답에 쓰인 벡터 문자(보통 a, b, c) 밖의 글자가 있으면 형식 오류로 본다 (예: "hello")
    const allowed = new Set([...Object.keys(want), "a", "b", "c"]);
    if (Object.keys(got).some((k) => !allowed.has(k))) return null;
    const keys = new Set([...Object.keys(got), ...Object.keys(want)]);
    return { ok: [...keys].every((k) => Math.abs((got[k] ?? 0) - (want[k] ?? 0)) < EPS), display: raw };
  }
  const v = evaluate(raw), w = evaluate(lv.answer);
  if (v === null || w === null) return null;
  return { ok: Math.abs(v - w) < EPS, display: raw.slice(0, 40) };
}

// 정답을 화면·인쇄용 글자로 (문항 표기법: [AB]는 벡터 AB, {a}는 벡터 a)
export function answerText(lv) {
  if (!lv) return "";
  if (lv.kind === "choice") return lv.options[Number(norm(lv.answer)[0]) - 1] ?? lv.answer;
  if (lv.kind === "set") return lv.answer.split(",").map((s) => `[${s.trim()}]`).join(", ");
  if (lv.kind === "vec") {
    const c = parseVecExpr(lv.answer) ?? {};
    const term = (k, v, first) => {
      const sign = v < 0 ? "−" : first ? "" : "+";
      const a = Math.abs(v);
      const num = a === 1 ? "" : Number.isInteger(a) ? String(a) : `${lv.answer.match(new RegExp(`([0-9./]+)${k}`))?.[1] ?? a}`;
      return `${sign}${num}{${k}}`;
    };
    return Object.entries(c).filter(([, v]) => v !== 0).map(([k, v], i) => term(k, v, i === 0)).join(" ") || "$\\vv{0}$";
  }
  return lv.answer;
}
