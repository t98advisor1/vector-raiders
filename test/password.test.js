import test from "node:test";
import assert from "node:assert/strict";

function samePassword(entered, expected) {
  const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return norm(entered) === norm(expected);
}

test("전체 관리자 비밀번호 119119 검증", () => {
  assert.equal(samePassword("119119", "119119"), true);
  assert.equal(samePassword("119-119", "119119"), true);
  assert.equal(samePassword(" 119119 ", "119119"), true);
  assert.equal(samePassword("119129", "119119"), false);
});
