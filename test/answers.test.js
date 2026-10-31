import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../src/mathexpr.js";

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

