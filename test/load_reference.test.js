import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("student.js에 정의되지 않은 load() 호출이 없어야 함", () => {
  const code = fs.readFileSync("public/js/student.js", "utf8");
  // load( 형태의 호출이 있는지 검사 (단, 정의가 없으면 안 됨)
  const matches = [...code.matchAll(/\bload\(/g)];
  // 만약 load가 쓰인다면 store의 별칭으로 정의되어 있어야 함
  if (matches.length > 0) {
    assert.equal(code.includes("const load =") || code.includes("function load("), true, "load 함수가 정의되어 있어야 함");
  }
});
