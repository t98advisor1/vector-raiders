// 서버에만 있는 정답표. 학생 화면 코드(public/)에는 정답을 두지 않는다.
// 문제 내용과 확인 도구는 public/js/problems.js에 있고, id와 diff로 연결된다.
import { evaluate } from "./mathexpr.js";

// 난이도별 정답표 (low: 초심자 교과서 예제형, mid: 기본 중단원형, high: 심화 수능 ㄱㄴㄷ 및 2인 협동형)
export const ANSWERS = {
  p1: {
    low: { type: "set", value: ["FO", "OC", "ED"], text: "$\\VV{FO}$, $\\VV{OC}$, $\\VV{ED}$" },
    mid: { type: "set", value: ["AO", "OD", "FE"], text: "$\\VV{AO}$, $\\VV{OD}$, $\\VV{FE}$" },
    high: { type: "choice", value: ["5", "ㄱ,ㄴ,ㄷ", "ㄱ, ㄴ, ㄷ"], text: "⑤ ㄱ, ㄴ, ㄷ" },
  },
  p2: {
    low: { type: "num", value: 2, text: "$2$" },
    mid: { type: "num", value: 4, text: "$4$" },
    high: { type: "num", value: 8 * Math.SQRT2, text: "$8\\sqrt{2}$" },
  },
  p3: {
    low: { type: "num", value: 0, text: "$0$" },
    mid: { type: "num", value: 1 / 2, text: "$\\dfrac{1}{2}$" },
    high: { type: "choice", value: ["5", "ㄱ,ㄴ,ㄷ", "ㄱ, ㄴ, ㄷ"], text: "⑤ ㄱ, ㄴ, ㄷ" },
  },
  p4: {
    low: { type: "num", value: 2, text: "$m=2$" },
    mid: { type: "num", value: 1, text: "$m=1$" },
    high: { type: "num", value: -6, text: "$m=-6$" },
  },
  p5: {
    low: { type: "num", value: 1, text: "$1$" },
    mid: { type: "num", value: 2, text: "$m=2$" },
    high: { type: "choice", value: ["5", "ㄱ,ㄴ,ㄷ", "ㄱ, ㄴ, ㄷ"], text: "⑤ ㄱ, ㄴ, ㄷ" },
  },
  p6: {
    low: { type: "num", value: 2, text: "$2$" },
    mid: { type: "num", value: -4, text: "$m=-4$" },
    high: { type: "num", value: 8, text: "$8$" },
  },
  p7: {
    low: { type: "num", value: 3, text: "$3$" },
    mid: { type: "num", value: Math.PI / 2, text: "$\\dfrac{\\pi}{2}$" },
    high: { type: "num", value: 21, text: "$21$" },
  },
};

export const ANSWER_TEXT = Object.fromEntries(
  Object.entries(ANSWERS).map(([pid, m]) => [pid, m.mid?.text ?? m.text ?? ""])
);

// 형성평가 답지용: 문제마다 난이도별 정답 글자 { p1: { low, mid, high }, ... }
export const ANSWER_TEXT_BY_DIFF = Object.fromEntries(
  Object.entries(ANSWERS).map(([pid, m]) => [pid, Object.fromEntries(["low", "mid", "high"].map((d) => [d, m[d]?.text ?? m.text ?? ""]))])
);

export const PROBLEM_IDS = Object.keys(ANSWERS);

const EPS = 1e-6;

// 반환값: { ok: boolean, display: string } 또는 형식이 잘못되면 null
export function checkAnswer(pid, answer, diff = "mid") {
  const prob = ANSWERS[pid];
  if (!prob) return null;
  const key = prob[diff] ?? prob.mid ?? prob;
  if (!key) return null;

  if (key.type === "set") {
    if (!Array.isArray(answer) || answer.length > 10) return null;
    const picked = [...new Set(answer.filter((x) => typeof x === "string" && /^[A-Z]{2}$/.test(x)))].sort();
    if (picked.length === 0) return null;
    const want = [...key.value].sort();
    const ok = picked.length === want.length && picked.every((x, i) => x === want[i]);
    return { ok, display: picked.join(", ") };
  }

  if (key.type === "choice") {
    const raw = String(answer ?? "").trim();
    if (!raw) return null;
    const allowed = Array.isArray(key.value) ? key.value : [String(key.value)];
    const ok = allowed.some((v) => v.replace(/\s/g, "") === raw.replace(/\s/g, ""));
    return { ok, display: raw.slice(0, 40) };
  }

  const v = evaluate(answer);
  if (v === null) return null;
  return { ok: Math.abs(v - key.value) < EPS, display: String(answer).trim().slice(0, 40) };
}
