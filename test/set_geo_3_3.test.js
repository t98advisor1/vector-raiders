// 3-3 문항 세트(content/sets/geo-3-3.md): 27문항의 정답을 좌표 계산으로 다시 구해 맞는지 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSet } from "../src/setfile.js";
import { evaluate } from "../src/mathexpr.js";

const set = parseSet(fs.readFileSync(new URL("../content/sets/geo-3-3.md", import.meta.url), "utf8"));
const ans = (no, lv) => set.boxes[no - 1].levels[lv].answer;
const num = (no, lv) => evaluate(ans(no, lv));
const close = (x, y) => Math.abs(x - y) < 1e-9;
const dot = (u, v) => u.reduce((s, x, i) => s + x * v[i], 0);
const len = (u) => Math.sqrt(dot(u, u));
const sub = (u, v) => u.map((x, i) => x - v[i]);
const addv = (u, v) => u.map((x, i) => x + v[i]);
const mul = (k, u) => u.map((x) => k * x);
const angleDeg = (u, v) => (Math.acos(Math.abs(dot(u, v)) / (len(u) * len(v))) * 180) / Math.PI;
// 점 A에서 평면 n·x + d = 0에 내린 수선의 발
const foot = (A, n, d) => sub(A, mul((dot(n, A) + d) / dot(n, n), n));
const onLine = (A, u, P) => { const w = sub(P, A); const k = w.find((_, i) => u[i] !== 0) / u.find((x) => x !== 0); return w.every((x, i) => close(x, k * u[i])); };

test("세트 형식: 상자 9개, 협업은 3·4방 상, 핵심 카드", () => {
  assert.deepEqual(set.errors, []);
  assert.equal(set.boxes.length, 9);
  for (const b of set.boxes) assert.equal(b.coop, b.room >= 3);
  assert.ok(set.cards.length >= 10);
});

test("상자 1: 좌표평면의 직선", () => {
  assert.ok(onLine([1, 2], [3, -1], [num(1, "low"), 0]));
  assert.ok(onLine([1, 3], sub([3, 7], [1, 3]), [num(1, "mid"), 11]));
  // ㄱ 참, ㄴ (3,3) 안 지남, ㄷ 수직 → ③
  assert.ok(!onLine([1, -1], [2, 3], [3, 3]));
  assert.ok(close(dot([2, 3], [3, -2]), 0));
  assert.equal(ans(1, "high"), "3");
});

test("상자 2: 좌표공간의 직선", () => {
  const A = [1, -2, 3], u = [2, 1, -1];
  const t = (5 - 1) / 2;
  assert.ok(close(num(2, "low"), A[2] + t * u[2]));
  const B = [1, 0, 2], d = sub([3, 2, -2], B);
  const t2 = (6 - 2) / -4, P = addv(B, mul(t2, d));
  assert.ok(close(num(2, "mid"), P[0] + P[1]));
  const C = [2, -1, 1], v = [3, -1, 2];
  const t3 = (1 + 1) / -1, Q = addv(C, mul(t3, v));
  assert.ok(close(Q[1], 1) && close(num(2, "high"), Q[0] + Q[2]));
});

test("상자 3: 두 직선이 이루는 각", () => {
  assert.ok(close(num(3, "low"), angleDeg([1, 0], [1, 1])));
  assert.ok(close(num(3, "mid"), angleDeg([1, 1, 0], [1, 0, 1])));
  const k = num(3, "high");
  assert.ok(k !== 0 && close(angleDeg([1, 1, k], [1, 0, 1]), 60));
});

test("상자 4: 평행과 수직", () => {
  const k = num(4, "low");
  assert.ok(close(2 * 6 - k * 4, 0));
  assert.ok(close(dot([2, -1, 3], [1, num(4, "mid"), 2]), 0));
  const u1 = [2, -1, 2], u2 = [-4, 2, -4], u3 = [1, 4, 1];
  assert.ok(close(len(addv(u2, mul(2, u1))), 0)); // ㄱ 평행
  assert.ok(close(dot(u1, u3), 0)); // ㄴ 수직
  assert.ok(!onLine([0, 3, 1], u2, [-4, 5, 3])); // ㄷ 거짓
  assert.equal(ans(4, "high"), "2");
});

test("상자 5: 평면의 방정식", () => {
  // 2x + y + 3z − 7 = 0
  const n = [2, 1, 3], d = -dot(n, [1, -1, 2]);
  assert.ok(close(num(5, "low"), -d / 2));
  const n2 = [1, -2, 2], d2 = -dot(n2, [2, 0, -1]);
  assert.ok(close(dot(n2, [num(5, "mid"), 1, 1]) + d2, 0));
  const H = foot([1, 1, 1], [2, -1, 2], 3);
  assert.ok(close(num(5, "high"), H[0] + H[1] + H[2]));
});

test("상자 6: 두 평면", () => {
  const k = num(6, "low");
  assert.ok(close(len(sub([2, k, -2], mul(2, [1, 2, -1]))), 0));
  assert.ok(close(num(6, "mid"), angleDeg([1, 1, 0], [0, 1, 1])));
  // k² + k − 3 = 0의 두 근의 합, 각 근에서 실제로 수직
  const r = Math.sqrt(1 + 12);
  const roots = [(-1 + r) / 2, (-1 - r) / 2];
  for (const kk of roots) assert.ok(close(dot([1, kk, 1], [kk, kk, -3]), 0));
  assert.ok(close(num(6, "high"), roots[0] + roots[1]));
});

test("상자 7: 점과 평면 사이의 거리", () => {
  assert.ok(close(num(7, "low"), len(foot([0, 0, 0], [2, -1, 2], -9))));
  const A = [1, -1, 2];
  assert.ok(close(num(7, "mid"), len(sub(A, foot(A, [1, 2, 2], -7)))));
  const P = [1, 2, 3], H = foot(P, [1, 1, 1], -3);
  const Q = sub(mul(2, H), P);
  assert.ok(close(num(7, "high"), len(Q)));
});

test("상자 8: 구", () => {
  assert.ok(close(num(8, "low"), 3 + 2));
  assert.ok(close(num(8, "mid"), len(sub([3, 4, -2], [1, 0, 2])) / 2));
  // z축 위 (0,0,z): 1 + 4 + (z−3)² = 25
  const z1 = 3 + Math.sqrt(20), z2 = 3 - Math.sqrt(20);
  for (const z of [z1, z2]) assert.ok(close(len(sub([0, 0, z], [1, 2, 3])), 5));
  assert.ok(close(num(8, "high"), z1 - z2));
});

test("상자 9: 벡터방정식과 도형", () => {
  assert.ok(close(num(9, "low"), 4 * Math.PI * 4));
  const r = len(sub([3, -2, 3], [1, 2, -1])) / 2;
  assert.ok(close(num(9, "mid"), (4 / 3) * Math.PI * r ** 3));
  // p·p − a·p = 0 → 중심 a/2, 반지름 |a|/2. 구 위의 임의의 점에서 식이 성립하는지 확인
  const a = [2, 2, 1], c = mul(0.5, a), R = len(a) / 2;
  for (const dir of [[1, 0, 0], [0, 1, 0], [0.6, 0, 0.8]]) {
    const p = addv(c, mul(R, dir));
    assert.ok(close(dot(a, p), dot(p, p)));
  }
  assert.ok(close(num(9, "high"), (4 / 3) * Math.PI * R ** 3));
});
