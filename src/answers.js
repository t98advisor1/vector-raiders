// 서버에만 있는 정답표. 학생 화면 코드(public/)에는 정답을 두지 않는다.
// 문제 내용과 확인 도구는 public/js/problems.js에 있고, id로 연결된다.
import { evaluate } from "./mathexpr.js";

export const ANSWERS = {
  p1: { type: "set", value: ["AO", "OD", "FE"] },
  p2: { type: "num", value: 4 },
  p3: { type: "num", value: 1 / 2 },
  p4: { type: "num", value: 1 },
  p5: { type: "num", value: 2 },
  p6: { type: "num", value: -4 },
  p7: { type: "num", value: Math.PI / 2 },
};

export const PROBLEM_IDS = Object.keys(ANSWERS);

const EPS = 1e-6;

// 반환값: { ok: boolean, display: string } 또는 형식이 잘못되면 null
export function checkAnswer(pid, answer) {
  const key = ANSWERS[pid];
  if (!key) return null;
  if (key.type === "set") {
    if (!Array.isArray(answer) || answer.length > 10) return null;
    const picked = [...new Set(answer.filter((x) => typeof x === "string" && /^[A-Z]{2}$/.test(x)))].sort();
    if (picked.length === 0) return null;
    const want = [...key.value].sort();
    const ok = picked.length === want.length && picked.every((x, i) => x === want[i]);
    return { ok, display: picked.join(", ") };
  }
  const v = evaluate(answer);
  if (v === null) return null;
  return { ok: Math.abs(v - key.value) < EPS, display: String(answer).trim().slice(0, 40) };
}
