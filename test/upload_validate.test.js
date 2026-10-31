// 전체 관리자가 올리는 md 세트 검사
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateSet } from "../src/setfile.js";
import { gradeLevel } from "../src/answers.js";

const good = fs.readFileSync(new URL("../content/sets/geo-3-1.md", import.meta.url), "utf8").replace("세트: geo-3-1", "세트: my-test-set");

test("올바른 세트는 통과하고 요약을 돌려준다", () => {
  const r = validateSet(good, gradeLevel);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
  assert.equal(r.id, "my-test-set");
  assert.equal(r.summary.items, 27);
  assert.equal(r.summary.coop, 4);
});

test("잘못된 세트는 이유를 알려 준다", () => {
  assert.equal(validateSet("", gradeLevel).ok, false);
  const badId = validateSet(good.replace("세트: my-test-set", "세트: 한글 이름"), gradeLevel);
  assert.ok(badId.errors.some((e) => e.includes("세트:")));
  const badAnswer = validateSet(good.replace("정답: 2√2\n풀이: [EG]", "정답: 이루트이\n풀이: [EG]"), gradeLevel);
  assert.ok(badAnswer.errors.some((e) => e.includes("상자 1 하") && e.includes("채점기")), JSON.stringify(badAnswer.errors));
  const fewBoxes = validateSet(good.split("# 상자 9")[0], gradeLevel);
  assert.ok(fewBoxes.errors.some((e) => e.includes("9개")));
});

test("제목에 들어간 HTML 글자는 지운다", () => {
  const r = validateSet(good.replace("# 상자 1 · 벡터의 크기", '# 상자 1 · <img src=x onerror="alert(1)">크기'), gradeLevel);
  assert.ok(!/[<>"]/.test(r.set.boxes[0].title));
});
