// 3-1 문항 세트(content/sets/geo-3-1.md): 27문항의 정답을 좌표·벡터 계산으로 다시 구해 맞는지 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSet, parseVecExpr } from "../src/setfile.js";
import { evaluate } from "../src/mathexpr.js";

const set = parseSet(fs.readFileSync(new URL("../content/sets/geo-3-1.md", import.meta.url), "utf8"));
const ans = (no, lv) => set.boxes[no - 1].levels[lv].answer;
const num = (no, lv) => evaluate(ans(no, lv));
const vec = (no, lv) => parseVecExpr(ans(no, lv));
const close = (x, y) => Math.abs(x - y) < 1e-9;
const sameVec = (u, v) => ["a", "b", "c"].every((k) => close(u[k] ?? 0, v[k] ?? 0));

// 정육각형 (한 변 1): A 왼쪽 위부터 시계 반대 방향, O 중심
const r3 = Math.sqrt(3) / 2;
const H = { O: [0, 0], A: [-0.5, r3], B: [-1, 0], C: [-0.5, -r3], D: [0.5, -r3], E: [1, 0], F: [0.5, r3] };
const hv = (s) => [H[s[1]][0] - H[s[0]][0], H[s[1]][1] - H[s[0]][1]];
const eq2 = (u, v) => close(u[0], v[0]) && close(u[1], v[1]);
const add2 = (u, v) => [u[0] + v[0], u[1] + v[1]];
const len2 = (u) => Math.hypot(u[0], u[1]);
// 2차원 벡터 x를 a, b의 일차결합으로 (a, b 일차독립)
const coef = (x, a, b) => { const d = a[0] * b[1] - a[1] * b[0]; return { a: (x[0] * b[1] - x[1] * b[0]) / d, b: (a[0] * x[1] - a[1] * x[0]) / d }; };

test("세트 형식: 상자 9개 × 하·중·상, 협업 상자는 3·4방, 핵심 카드", () => {
  assert.deepEqual(set.errors, []);
  assert.equal(set.boxes.length, 9);
  for (const b of set.boxes) assert.equal(b.coop, b.room >= 3, `상자 ${b.no} 협업 여부`);
  assert.ok(set.cards.length >= 10);
});

test("상자 1: 벡터의 크기", () => {
  assert.ok(close(num(1, "low"), Math.hypot(2, 2)));
  assert.ok(close(num(1, "mid"), Math.hypot(2, 2, 2)));
  // ㄱ |AC|=5 참, ㄴ |AG|=13 참, ㄷ |EG| = 13−12 거짓 → ② ㄱ,ㄴ
  assert.equal(Math.hypot(3, 4), 5); assert.equal(Math.hypot(3, 4, 12), 13); assert.notEqual(Math.hypot(3, 4), 13 - 12);
  assert.equal(ans(1, "high"), "2");
});

test("상자 2: 서로 같은 벡터 (정육각형)", () => {
  const pick = (opts, target) => opts.filter((o) => eq2(hv(o), target)).sort();
  const b = set.boxes[1].levels;
  assert.deepEqual(pick(b.low.options, hv("AB")), b.low.answer.split(",").map((s) => s.trim()).sort());
  assert.deepEqual(pick(b.mid.options, hv("BA")), b.mid.answer.split(",").map((s) => s.trim()).sort());
  // ㄱ 참, ㄴ 참, ㄷ |AD| = 2 ≠ 3 → ② ㄱ,ㄴ
  assert.ok(eq2(add2(hv("AB"), hv("AF")), hv("AO")));
  assert.ok(eq2(add2(hv("AC"), hv("AE")), hv("AO").map((x) => 3 * x)));
  assert.ok(!close(len2(add2(add2(hv("AB"), hv("BC")), hv("CD"))), 3));
  assert.equal(ans(2, "high"), "2");
});

test("상자 3: 덧셈과 연산 법칙", () => {
  // 임의의 네 점으로 확인
  const P = { A: [0, 0], B: [3, 1], C: [4, 5], D: [-2, 3] };
  const v = (s) => [P[s[1]][0] - P[s[0]][0], P[s[1]][1] - P[s[0]][1]];
  const sum = (...xs) => xs.reduce(add2);
  assert.ok(eq2(sum(v("AB"), v("BC"), v("CD")), v(ans(3, "low"))));
  assert.ok(eq2(sum(v("AC"), v("BA"), v("DB")), v(ans(3, "mid"))));
  // ㄱ 참, ㄴ AB−AC = CB(거짓), ㄷ 참 → ③
  assert.ok(eq2(sum(v("AB"), v("BC"), v("CA")), [0, 0]));
  assert.ok(!eq2(add2(v("AB"), v("AC").map((x) => -x)), v("BC")));
  assert.equal(ans(3, "high"), "3");
});

test("상자 4: 뺄셈 (평행사변형·정육각형)", () => {
  // 평행사변형: O 원점, A = a, B = b일 때 AB = b − a
  const a = [2, 1], b = [-1, 3];
  assert.ok(sameVec(vec(4, "low"), coef(add2(b, a.map((x) => -x)), a, b)));
  const A = hv("OA"), C = hv("OC");
  assert.ok(sameVec(vec(4, "mid"), coef(hv("OE"), A, C)));
  assert.ok(sameVec(vec(4, "high"), coef(add2(hv("AE"), hv("FD")), A, C)));
});

test("상자 5: 직육면체", () => {
  // A 원점, a = AB, b = AD, c = AE 를 성분으로 놓고 계산
  const Q = { A: [0, 0, 0], B: [1, 0, 0], D: [0, 1, 0], E: [0, 0, 1], C: [1, 1, 0], F: [1, 0, 1], G: [1, 1, 1], H: [0, 1, 1] };
  const v3 = (s) => Q[s[1]].map((x, i) => x - Q[s[0]][i]);
  const asCoef = ([x, y, z]) => ({ a: x, b: y, c: z });
  assert.ok(sameVec(vec(5, "low"), asCoef(v3("AG"))));
  assert.ok(sameVec(vec(5, "mid"), asCoef(v3("DF"))));
  const s = ["AG", "BH", "CE", "DF"].map(v3).reduce((p, q) => p.map((x, i) => x + q[i]));
  const cg = v3("CG");
  const m = s[2] / cg[2];
  assert.ok(s.every((x, i) => close(x, m * cg[i])));
  assert.ok(close(num(5, "high"), m));
});

test("상자 6: 실수배", () => {
  // 2(a+3b) − (a−b)
  assert.ok(sameVec(vec(6, "low"), { a: 2 - 1, b: 6 + 1 }));
  // 3(x − a) = x + 2b → x = (3a + 2b)/2
  const x = vec(6, "mid");
  assert.ok(sameVec({ a: 3 * x.a - 3, b: 3 * x.b }, { a: x.a, b: x.b + 2 }));
  // x + y = 3a − b, x − y = a + 5b
  const xh = vec(6, "high"), y = { a: 3 - xh.a, b: -1 - xh.b };
  assert.ok(sameVec({ a: xh.a - y.a, b: xh.b - y.b }, { a: 1, b: 5 }));
});

test("상자 7: 평행 (계수 비례)", () => {
  const parallel = (u, v) => close(u.a * v.b - u.b * v.a, 0);
  assert.ok(parallel({ a: 2, b: 3 }, { a: 4, b: num(7, "low") }));
  const m = num(7, "mid");
  assert.ok(parallel({ a: 2 - 1, b: -3 + 1 }, { a: -1 - m, b: 1 + 3 }));
  assert.ok(parallel({ a: 1 + 3, b: 2 - 1 }, { a: num(7, "high"), b: 4 }));
});

test("상자 8: 세 점이 한 직선 위", () => {
  // 실제 점으로 확인: O 원점, A = a, B = b (평행하지 않게)
  const a = [3, 1], b = [1, 2];
  const pt = (s, t) => [s * a[0] + t * b[0], s * a[1] + t * b[1]];
  const col = (P, Q, R) => close((Q[0] - P[0]) * (R[1] - P[1]) - (Q[1] - P[1]) * (R[0] - P[0]), 0);
  assert.ok(col(pt(1, 0), pt(0, 1), pt(2, num(8, "low"))));
  const m = num(8, "mid");
  assert.ok(col(pt(1, 0), pt(0, 1), pt(2 * m, m - 5)));
  assert.ok(col(pt(1, 1), pt(3, -1), pt(4, num(8, "high"))));
});

test("상자 9: 종합", () => {
  assert.ok(close(num(9, "low"), Math.hypot(2, 2)));
  // 한 변 s: |BN| = √(s² + (s/2)²) = 2√5
  const s = num(9, "mid");
  assert.ok(close(Math.hypot(s, s / 2), 2 * Math.sqrt(5)));
  // Q의 자취: 원점에서 원 (2,2) 반지름 2에 그은 접선 사이의 각 × 반지름 1
  const half = Math.asin(2 / Math.hypot(2, 2));
  assert.ok(close(num(9, "high"), 2 * half));
});
