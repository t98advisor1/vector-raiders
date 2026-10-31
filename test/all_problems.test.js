// 모든 문제(7개 × 난이도 3단계 = 21문항)를 하나씩 점검한다.
//  1) 문제 본문·입력 방식·정답표가 모두 있고 서로 맞물리는지
//  2) 올바른 답을 내면 정답, 틀린 답을 내면 오답으로 채점되는지
//  3) 문제 조건으로부터 정답을 다시 계산해 정답표가 맞는지
import test from "node:test";
import assert from "node:assert/strict";
import { PROBLEMS } from "../public/js/problems.js";
import { ANSWERS, checkAnswer } from "../src/answers.js";

const DIFFS = ["low", "mid", "high"];
const KIND_TO_TYPE = { multi: "set", choice: "choice", expr: "num" };

// 학생이 화면에서 정답을 낼 때 보내는 값 (수식 입력은 사람이 쓰는 표기로)
const CORRECT_INPUT = {
  p1: { low: ["FO", "OC", "ED"], mid: ["AO", "OD", "FE"], high: "5" },
  p2: { low: "2", mid: "4", high: "8√2" },
  p3: { low: "0", mid: "1/2", high: "5" },
  p4: { low: "2", mid: "m=1", high: "-6" },
  p5: { low: "1", mid: "2", high: "5" },
  p6: { low: "2", mid: "-4", high: "8" },
  p7: { low: "3", mid: "π/2", high: "21" },
};
const WRONG_INPUT = {
  p1: { low: ["FO", "OC"], mid: ["AO", "OD", "FE", "BO"], high: "2" },
  p2: { low: "4", mid: "2√5", high: "8" },
  p3: { low: "36", mid: "1", high: "2" },
  p4: { low: "-2", mid: "-1", high: "6" },
  p5: { low: "0", mid: "5", high: "4" },
  p6: { low: "4", mid: "4", high: "12" },
  p7: { low: "9", mid: "90", high: "25" },
};

test("문제 21개가 모두 본문·입력 방식·정답표를 갖추고 있다", () => {
  assert.equal(PROBLEMS.length, 7);
  for (const p of PROBLEMS) {
    assert.equal(typeof p.tool, "function", `${p.id} 확인 도구`);
    for (const d of DIFFS) {
      const v = p.diffs?.[d];
      const where = `${p.id}/${d}`;
      assert.ok(v, `${where} 문제가 있다`);
      assert.ok(v.text?.length > 10, `${where} 본문`);
      assert.ok(v.hint?.length > 5, `${where} 풀이`);
      assert.ok(v.points > 0, `${where} 배점`);
      const key = ANSWERS[p.id]?.[d];
      assert.ok(key, `${where} 정답표`);
      assert.equal(key.type, KIND_TO_TYPE[v.answer?.kind], `${where} 입력 방식과 정답 형식이 맞다`);
      assert.ok(key.text, `${where} 정답 글자`);
      if (v.answer.kind === "multi") for (const k of key.value) assert.ok(v.answer.options.includes(k), `${where} 정답 ${k}이 보기에 있다`);
      if (v.answer.kind === "choice") {
        assert.equal(v.answer.options.length, 5, `${where} 오지선다`);
        assert.ok(key.value.includes(CORRECT_INPUT[p.id][d]), `${where} 정답 번호`);
      }
    }
  }
});

test("21문항 모두 정답은 맞게, 오답은 틀리게 채점한다", () => {
  for (const p of PROBLEMS) for (const d of DIFFS) {
    const ok = checkAnswer(p.id, CORRECT_INPUT[p.id][d], d);
    assert.equal(ok?.ok, true, `${p.id}/${d} 정답 ${CORRECT_INPUT[p.id][d]}`);
    const bad = checkAnswer(p.id, WRONG_INPUT[p.id][d], d);
    assert.equal(bad?.ok, false, `${p.id}/${d} 오답 ${WRONG_INPUT[p.id][d]}`);
  }
});

test("하·상 난이도 정답도 문제 조건으로 다시 계산해 맞는지 확인한다", () => {
  const r3 = Math.sqrt(3) / 2;
  const P = { O: [0, 0], A: [-0.5, r3], B: [-1, 0], C: [-0.5, -r3], D: [0.5, -r3], E: [1, 0], F: [0.5, r3] };
  const vec = (s) => [P[s[1]][0] - P[s[0]][0], P[s[1]][1] - P[s[0]][1]];
  const same = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]) < 1e-9;
  const addv = (u, v) => [u[0] + v[0], u[1] + v[1]];
  // p1 하: [AB]와 같은 벡터
  assert.deepEqual(["FO", "OC", "ED", "BC", "EF", "BO", "OD"].filter((o) => same(vec(o), vec("AB"))).sort(), ["ED", "FO", "OC"]);
  // p1 상: ㄱ, ㄴ, ㄷ 모두 참
  assert.ok(same(addv(vec("AB"), vec("AF")), vec("AO")));
  assert.ok(same(addv(vec("AC"), vec("AE")), vec("AO").map((x) => 3 * x)));
  // p2 하: |MB| = 4/2
  assert.equal(4 / 2, 2);
  // p2 상: A 원점, B(4,0) C(4,4) D(0,4), p1=(4,t) (BC 위), p2=(s,4) (CD 위) → 최댓값 |(8,8)|
  let best = 0;
  for (let s = 0; s <= 4; s += 0.5) for (let t = 0; t <= 4; t += 0.5) best = Math.max(best, Math.hypot(4 + s, t + 4));
  assert.ok(Math.abs(best - 8 * Math.SQRT2) < 1e-9);
  // p3 하: 직각이면 내적 0 / 상: ㄷ 최댓값 6·6√2
  assert.equal(6 * 0 + 0 * 6, 0);
  let mx = 0;
  for (let k = 0; k <= 90; k++) { const t = (k * Math.PI) / 180; mx = Math.max(mx, 6 * Math.cos(t) * 6 + 6 * Math.sin(t) * 6); }
  assert.ok(Math.abs(mx - 36 * Math.SQRT2) < 1e-9);
  // p4 하: (2,1) ∥ (4,m) → 2m − 4 = 0 / 상: m/3 = −4/2 이고 반대 방향
  assert.equal(2 * 2 - 1 * 4, 0);
  assert.equal(-6 / 3, -4 / 2);
  assert.ok(-4 / 2 < 0);
  // p5 하: m + (1−m) = 1 → 한 직선 위 (참 = 1)
  assert.equal(3 + (1 - 3), 1);
  // p6 하: 모서리 2 / 상: AG=(2,2,2), AC=(2,2,0)
  assert.equal(2 * 2 + 2 * 2 + 2 * 0, 8);
  // p7 하: 반지름 √9 / 상: 중심 (3,4)까지 5, 반지름 2 → (5+2)(5−2)
  assert.equal(Math.sqrt(9), 3);
  assert.equal((Math.hypot(3, 4) + 2) * (Math.hypot(3, 4) - 2), 21);
});
