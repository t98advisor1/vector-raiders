import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkTeacherPassword, parseChannelPasswords } from "../src/passwords.js";

// 테스트용 값일 뿐, 실제 비밀번호는 Cloudflare 비밀 값에만 있다.
const env = { TEACHER_PASSWORD: "1111", CHANNEL_PASSWORDS: "1=2221,2229;2=2222" };

test("전체 관리자 비밀번호는 모든 채널에 들어간다", () => {
  assert.equal(checkTeacherPassword(env, "1", "1111"), "ok");
  assert.equal(checkTeacherPassword(env, "7", "1111"), "ok");
  assert.equal(checkTeacherPassword(env, "3", "11-11"), "ok");
  assert.equal(checkTeacherPassword(env, "3", " 1111 "), "ok");
  assert.equal(checkTeacherPassword(env, "3", "1112"), "wrong");
});

test("채널 비밀번호는 그 채널에만 들어간다", () => {
  assert.equal(checkTeacherPassword(env, "1", "2221"), "ok");
  assert.equal(checkTeacherPassword(env, "1", "2229"), "ok");
  assert.equal(checkTeacherPassword(env, "2", "2222"), "ok");
  assert.equal(checkTeacherPassword(env, "2", "2221"), "wrong");
  assert.equal(checkTeacherPassword(env, "1", ""), "wrong");
});

test("비밀 값이 없으면 기본 비밀번호 없이 막는다", () => {
  assert.equal(checkTeacherPassword({}, "1", "1234"), "unset");
  assert.equal(checkTeacherPassword({ CHANNEL_PASSWORDS: "2=2222" }, "1", "2222"), "unset");
});

test("채널 비밀번호 형식 읽기", () => {
  const m = parseChannelPasswords(" 1 = 2221 , 2229 ; ;2=2222;bad;3=");
  assert.deepEqual([...m], [["1", ["2221", "2229"]], ["2", ["2222"]]]);
});

test("공개 코드에 비밀번호가 적혀 있지 않다", () => {
  for (const f of ["src/room.js", "src/passwords.js", "public/teacher.html"]) {
    const s = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(s, /119-?119|8282[1-7]/, f);
  }
});
