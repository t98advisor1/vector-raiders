import test from "node:test";
import assert from "node:assert/strict";
import { PROBLEMS, DIFFICULTY } from "../public/js/problems.js";
import { TABLETS, PLATFORMS } from "../public/js/game.js";
import { checkAnswer } from "../src/answers.js";

test("모든 7개 문제에 3대 난이도(low, mid, high)가 완전 분기되어 있다", () => {
  assert.equal(PROBLEMS.length, 7);
  for (const p of PROBLEMS) {
    assert.ok(p.diffs, `${p.id}에 diffs 객체가 있어야 함`);
    for (const d of ["low", "mid", "high"]) {
      const s = p.diffs[d];
      assert.ok(s, `${p.id}의 ${d} 난이도 스펙 존재`);
      assert.ok(s.text && s.text.length > 10, `${p.id}의 ${d} 지문 존재`);
      assert.ok(s.points > 0, `${p.id}의 ${d} 배점 존재`);
    }
  }
});

test("p2와 p4의 high 난이도는 2인 협동 레이드 관문이다", () => {
  const p2 = PROBLEMS.find((x) => x.id === "p2");
  const p4 = PROBLEMS.find((x) => x.id === "p4");
  assert.equal(p2.diffs.high.coop, true);
  assert.equal(p4.diffs.high.coop, true);
});

test("p1, p3, p5의 high 난이도는 수능형 5지선다 객관식 보기이다", () => {
  for (const pid of ["p1", "p3", "p5"]) {
    const p = PROBLEMS.find((x) => x.id === pid);
    assert.equal(p.diffs.high.answer.kind, "choice");
    assert.equal(p.diffs.high.answer.options.length, 5);
  }
});

test("난이도별 서버 정답 채점 검증", () => {
  // p1
  assert.equal(checkAnswer("p1", ["FO", "OC", "ED"], "low").ok, true);
  assert.equal(checkAnswer("p1", ["AO", "OD", "FE"], "mid").ok, true);
  assert.equal(checkAnswer("p1", "5", "high").ok, true);

  // p2
  assert.equal(checkAnswer("p2", "2", "low").ok, true);
  assert.equal(checkAnswer("p2", "4", "mid").ok, true);
  assert.equal(checkAnswer("p2", "8√2", "high").ok, true); // |(8,8)| = 8√2

  // p3
  assert.equal(checkAnswer("p3", "0", "low").ok, true);
  assert.equal(checkAnswer("p3", "1/2", "mid").ok, true);
  assert.equal(checkAnswer("p3", "5", "high").ok, true);

  // p4
  assert.equal(checkAnswer("p4", "2", "low").ok, true);
  assert.equal(checkAnswer("p4", "1", "mid").ok, true);
  assert.equal(checkAnswer("p4", "-6", "high").ok, true);

  // p5
  assert.equal(checkAnswer("p5", "1", "low").ok, true);
  assert.equal(checkAnswer("p5", "2", "mid").ok, true);
  assert.equal(checkAnswer("p5", "5", "high").ok, true);

  // p6
  assert.equal(checkAnswer("p6", "2", "low").ok, true);
  assert.equal(checkAnswer("p6", "-4", "mid").ok, true);
  assert.equal(checkAnswer("p6", "8", "high").ok, true); // (2,2,2)·(2,2,0) = 8

  // p7
  assert.equal(checkAnswer("p7", "3", "low").ok, true);
  assert.equal(checkAnswer("p7", "pi/2", "mid").ok, true);
  assert.equal(checkAnswer("p7", "21", "high").ok, true);
});

test("유적 곳곳에 14개 교과서 개념 비석이 배치되어 있다", () => {
  assert.equal(TABLETS.length, 14);
  for (const t of TABLETS) {
    assert.ok(t.id && t.key && t.title, `비석 정보 완전성: ${JSON.stringify(t)}`);
    assert.ok(t.x > 0 && t.x < 74 && t.y > 0 && t.y < 15, `비석 위치 유효성`);
  }
});

test("로블록스풍 3층 수직 발판이 유적 전 구역에 고르게 분포한다", () => {
  assert.ok(PLATFORMS.size >= 25, `발판 개수 ${PLATFORMS.size}`);
  let maxH = 0;
  for (const [, h] of PLATFORMS) if (h > maxH) maxH = h;
  assert.equal(maxH, 3.0, "3층 높이 발판 존재");
});
