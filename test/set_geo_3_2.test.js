// 3-2 문항 세트(content/sets/geo-3-2.md): 27문항의 정답을 성분 계산으로 다시 구해 맞는지 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSet, parseVecExpr } from "../src/setfile.js";
import { evaluate } from "../src/mathexpr.js";

const set = parseSet(fs.readFileSync(new URL("../content/sets/geo-3-2.md", import.meta.url), "utf8"));
const ans = (no, lv) => set.boxes[no - 1].levels[lv].answer;
const num = (no, lv) => evaluate(ans(no, lv));
const vec = (no, lv) => parseVecExpr(ans(no, lv));
const close = (x, y) => Math.abs(x - y) < 1e-9;
const dot = (u, v) => u.reduce((s, x, i) => s + x * v[i], 0);
const len = (u) => Math.sqrt(dot(u, u));
const sub = (u, v) => u.map((x, i) => x - v[i]);
const addv = (u, v) => u.map((x, i) => x + v[i]);
const mul = (k, u) => u.map((x) => k * x);
const parallel2 = (u, v) => close(u[0] * v[1] - u[1] * v[0], 0);

test("세트 형식: 상자 9개, 협업은 3·4방 상, 핵심 카드", () => {
  assert.deepEqual(set.errors, []);
  assert.equal(set.boxes.length, 9);
  for (const b of set.boxes) assert.equal(b.coop, b.room >= 3);
  assert.ok(set.cards.length >= 10);
});

test("상자 1: 위치벡터와 내분점", () => {
  // 실제 좌표로 확인: A, B 임의
  const A = [1, 5], B = [7, -1];
  const v = vec(1, "low");
  assert.ok(close(v.a, -1) && close(v.b, 1));
  const p = vec(1, "mid");
  const P = addv(mul(p.a, A), mul(p.b, B));
  assert.ok(close(len(sub(P, A)) / len(sub(B, P)), 2)); // AP : PB = 2 : 1
  assert.equal(ans(1, "high"), "2"); // ㄱ 참, ㄴ 참, ㄷ 거짓
  const [a, b, c] = [[0, 0], [6, 0], [0, 3]];
  const g = mul(1 / 3, addv(addv(a, b), c));
  assert.ok([a, b, c].map((x) => sub(x, g)).reduce(addv).every((x) => close(x, 0)));
});

test("상자 2: 평면벡터의 크기", () => {
  assert.ok(close(num(2, "low"), len([3, -4])));
  assert.ok(close(num(2, "mid"), len(sub([7, 6], [1, -2]))));
  let best = Infinity;
  for (let t = -3; t <= 3; t += 0.0001) best = Math.min(best, len(addv([2, 1], mul(t, [-1, 3]))));
  assert.ok(Math.abs(num(2, "high") - best) < 1e-6);
});

test("상자 3: 성분에 의한 연산", () => {
  const w = sub(mul(2, [2, -1]), [1, 3]);
  assert.ok(close(num(3, "low"), w[0] + w[1]));
  // c = x a + y b 풀기
  const [a, b, c] = [[1, 2], [2, -1], [4, 3]];
  const d = a[0] * b[1] - a[1] * b[0];
  const x = (c[0] * b[1] - c[1] * b[0]) / d, y = (a[0] * c[1] - a[1] * c[0]) / d;
  assert.ok(close(num(3, "mid"), x + y));
  // a = b → m = 1, n = 4, a = (2, 3)
  assert.ok(close(len([2, 3]), Math.sqrt(13)));
  assert.deepEqual(addv([2, 3], [2, 3]), [4, 6]);
  assert.equal(ans(3, "high"), "5");
});

test("상자 4: 공간벡터", () => {
  assert.ok(close(num(4, "low"), len([1, -2, 2])));
  assert.ok(close(num(4, "mid"), len(sub([4, 2, 8], [1, 0, 2]))));
  const [x, y] = [1, 2];
  assert.deepEqual(addv(mul(x, [1, 2, -1]), mul(y, [2, -1, 3])), [5, 0, 5]);
  assert.ok(close(num(4, "high"), x * y));
});

test("상자 5: 성분으로 본 평행", () => {
  assert.ok(parallel2([2, 3], [4, num(5, "low")]));
  // b = 2a: (2, −4, 6)
  assert.ok(close(num(5, "mid"), -4 + 6));
  const k = num(5, "high");
  const a = [1, 2], b = [3, -1];
  assert.ok(parallel2(addv(a, mul(2, b)), addv(mul(k, a), b)));
});

test("상자 6: 내적", () => {
  assert.ok(close(num(6, "low"), dot([3, 1], [2, -4])));
  assert.ok(close(num(6, "mid"), dot([1, -2, 2], [3, 0, -1])));
  // |a|=3, |b|=2, |a−b|=√7 를 만족하는 실제 벡터로 확인
  const ab = num(6, "high");
  const th = Math.acos(ab / 6);
  const a = [3, 0], b = [2 * Math.cos(th), 2 * Math.sin(th)];
  assert.ok(close(len(sub(a, b)), Math.sqrt(7)));
});

test("상자 7: 두 벡터가 이루는 각", () => {
  assert.ok(close(num(7, "low"), 2 * 3 * Math.cos(Math.PI / 3)));
  const deg = (Math.acos(dot([1, 1], [0, 2]) / (len([1, 1]) * len([0, 2]))) * 180) / Math.PI;
  assert.ok(close(num(7, "mid"), deg));
  const x = num(7, "high");
  assert.ok(x > 0);
  assert.ok(close(dot([1, 1, 0], [1, 0, x]) / (len([1, 1, 0]) * len([1, 0, x])), 0.5));
});

test("상자 8: 수직", () => {
  assert.ok(close(dot([2, -1], [num(8, "low"), 4]), 0));
  assert.ok(close(dot([1, 2, -1], [3, num(8, "mid"), 5]), 0));
  const t = num(8, "high"), a = [1, 2], b = [2, -1];
  assert.ok(close(dot(addv(a, mul(t, b)), sub(a, b)), 0));
});

test("상자 9: 도형과 내적", () => {
  const A = [0, 0], B = [3, 0], C = [3, 4], D = [0, 4];
  assert.ok(close(num(9, "low"), dot(sub(D, C), sub(A, C))));
  const G = [1, 2, 2], Dp = [0, 2, 0], F = [1, 0, 2];
  const DF = sub(F, Dp);
  assert.ok(close(num(9, "mid"), dot(G, DF) / (len(G) * len(DF))));
  // 직사각형 AB = √3, BC = 3, 정삼각형 EAD 바깥, P가 AE 위 어디든 같은 값
  const r3 = Math.sqrt(3);
  const a = [0, 0], c = [3, -r3], e = [1.5, 1.5 * r3];
  for (const s of [0, 0.3, 0.7, 1]) assert.ok(close(num(9, "high"), dot(sub(a, c), sub(mul(s, e), c))));
});
