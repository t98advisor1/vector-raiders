import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../src/mathexpr.js";
import { checkAnswer } from "../src/answers.js";

test("수식 입력을 계산한다", () => {
  assert.equal(evaluate("4"), 4);
  assert.equal(evaluate("-4"), -4);
  assert.equal(evaluate("−4"), -4);
  assert.equal(evaluate("m=1"), 1);
  assert.equal(evaluate("1/2"), 0.5);
  assert.equal(evaluate("0.5"), 0.5);
  assert.ok(Math.abs(evaluate("2√5") - 2 * Math.sqrt(5)) < 1e-12);
  assert.ok(Math.abs(evaluate("√3/2") - Math.sqrt(3) / 2) < 1e-12);
  assert.ok(Math.abs(evaluate("π/2") - Math.PI / 2) < 1e-12);
  assert.ok(Math.abs(evaluate("pi/2") - Math.PI / 2) < 1e-12);
  assert.ok(Math.abs(evaluate("1/2π") - Math.PI / 2) < 1e-12);
  assert.ok(Math.abs(evaluate("sqrt(20)") - Math.sqrt(20)) < 1e-12);
  assert.equal(evaluate("2^3"), 8);
});

test("잘못된 입력은 null", () => {
  for (const bad of ["", "abc", "1/0", "(1", "1..2", "alert(1)", "x".repeat(50), null, 3]) {
    assert.equal(evaluate(bad), null, String(bad));
  }
});

test("문제별 채점", () => {
  assert.equal(checkAnswer("p1", ["FE", "AO", "OD"]).ok, true);
  assert.equal(checkAnswer("p1", ["AO", "OD"]).ok, false);
  assert.equal(checkAnswer("p1", ["AO", "OD", "FE", "CO"]).ok, false);
  assert.equal(checkAnswer("p1", []), null);
  assert.equal(checkAnswer("p2", "4").ok, true);
  assert.equal(checkAnswer("p2", "2√5").ok, false);
  assert.equal(checkAnswer("p3", "1/2").ok, true);
  assert.equal(checkAnswer("p4", "m=1").ok, true);
  assert.equal(checkAnswer("p5", "2").ok, true);
  assert.equal(checkAnswer("p6", "-4").ok, true);
  assert.equal(checkAnswer("p6", "4").ok, false);
  assert.equal(checkAnswer("p7", "π/2").ok, true);
  assert.equal(checkAnswer("p7", "90").ok, false);
  assert.equal(checkAnswer("p9", "1"), null);
  assert.equal(checkAnswer("p2", "hello"), null);
});

// 문제 조건으로부터 정답을 다시 계산해 정답표가 맞는지 확인한다.
test("정답표 검산", () => {
  // p1: 정육각형 (A 왼쪽 위, B 왼쪽, C 왼쪽 아래, D 오른쪽 아래, E 오른쪽, F 오른쪽 위), 중심 O
  const r3 = Math.sqrt(3) / 2;
  const P = { O: [0, 0], A: [-0.5, r3], B: [-1, 0], C: [-0.5, -r3], D: [0.5, -r3], E: [1, 0], F: [0.5, r3] };
  const vec = (s) => [P[s[1]][0] - P[s[0]][0], P[s[1]][1] - P[s[0]][1]];
  const same = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]) < 1e-9;
  const options = ["AO", "OD", "FE", "CO", "EF", "DE", "BO"];
  const equal = options.filter((o) => same(vec(o), vec("BC"))).sort();
  assert.deepEqual(equal, ["AO", "FE", "OD"]);

  // p2: 정사각형 한 변 s, |MN − MB| = |BN| = s√5/2 = 2√5
  assert.ok(Math.abs((4 * Math.sqrt(5)) / 2 - 2 * Math.sqrt(5)) < 1e-12);

  // p3: m = cos30°, n = sin30°
  const m3 = Math.cos(Math.PI / 6), n3 = Math.sin(Math.PI / 6);
  assert.ok(Math.abs(m3 * m3 - n3 * n3 - 0.5) < 1e-12);

  // p4: p+q = a − 2b, q − r = (−1−m)a + 4b 가 평행 → (−1−m)/1 = 4/(−2)
  const m4 = 1;
  assert.equal((-1 - m4) * -2 - 4 * 1, 0);

  // p5: OC = 2m a + (m−5) b, 계수 합 = 1
  const m5 = 2;
  assert.equal(2 * m5 + (m5 - 5), 1);

  // p6: 직육면체, AG+BH+CE+DF = m GC
  const Q = { A: [0, 0, 2], B: [3, 0, 2], C: [3, 2, 2], D: [0, 2, 2], E: [0, 0, 0], F: [3, 0, 0], G: [3, 2, 0], H: [0, 2, 0] };
  const v3 = (s) => Q[s[1]].map((x, i) => x - Q[s[0]][i]);
  const sum = ["AG", "BH", "CE", "DF"].map(v3).reduce((a, b) => a.map((x, i) => x + b[i]));
  const gc = v3("GC");
  assert.deepEqual(sum, gc.map((x) => -4 * x + 0)); // + 0: -0을 0으로

  // p7: 원 (x−2)²+(y−2)²=4, 원점에서 중심까지 2√2, 반지름 2 → 접선 사이 각 90°
  const half = Math.asin(2 / (2 * Math.SQRT2));
  assert.ok(Math.abs(2 * half - Math.PI / 2) < 1e-12);
});
