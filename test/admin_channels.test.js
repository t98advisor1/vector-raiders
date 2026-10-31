import test from "node:test";
import assert from "node:assert/strict";
import { checkTeacherAccess, periodStatus, cleanPasswordList, cleanDate, todayKst } from "../src/passwords.js";

// 테스트용 값일 뿐, 실제 비밀번호는 Cloudflare 비밀 값에만 있다.
const env = { TEACHER_PASSWORD: "9999", CHANNEL_PASSWORDS: "1=1111;2=2222" };
const today = "2026-11-15";

test("전체 관리자는 기간과 상관없이 들어가고 master로 표시된다", () => {
  const over = { 1: { passwords: [], from: "2027-01-01", until: "" } };
  assert.deepEqual(checkTeacherAccess(env, "1", "9999", over, today), { result: "ok", master: true });
});

test("화면에서 정한 비밀번호가 비밀 값 대신 쓰인다", () => {
  const over = { 1: { passwords: ["5555"], from: "", until: "" } };
  assert.equal(checkTeacherAccess(env, "1", "5555", over, today).result, "ok");
  assert.equal(checkTeacherAccess(env, "1", "1111", over, today).result, "wrong");
  assert.equal(checkTeacherAccess(env, "2", "2222", over, today).result, "ok"); // 다른 채널은 비밀 값 그대로
  assert.equal(checkTeacherAccess(env, "1", "5555", over, today).master, false);
});

test("사용 기간 밖이면 중간관리자는 막힌다 (그날 포함)", () => {
  const cfg = { passwords: ["5555"], from: "2026-11-15", until: "2026-11-30" };
  assert.equal(checkTeacherAccess(env, "1", "5555", { 1: cfg }, "2026-11-14").result, "notyet");
  assert.equal(checkTeacherAccess(env, "1", "5555", { 1: cfg }, "2026-11-15").result, "ok");
  assert.equal(checkTeacherAccess(env, "1", "5555", { 1: cfg }, "2026-11-30").result, "ok");
  assert.equal(checkTeacherAccess(env, "1", "5555", { 1: cfg }, "2026-12-01").result, "expired");
  assert.equal(checkTeacherAccess(env, "1", "0000", { 1: cfg }, "2026-12-01").result, "wrong"); // 틀린 비밀번호는 기간을 알려 주지 않는다
  assert.equal(periodStatus({}, today), "ok");
  assert.equal(periodStatus({ until: "2026-11-15" }, today), "ok");
});

test("비밀번호·날짜 입력 정리", () => {
  assert.deepEqual(cleanPasswordList(" 12-34 , 5678,5678"), { ok: true, list: ["1234", "5678"] });
  assert.equal(cleanPasswordList("").ok, false);
  assert.equal(cleanPasswordList("123").ok, false);
  assert.equal(cleanPasswordList("12;34").ok, false);
  assert.equal(cleanDate("2026-11-01"), "2026-11-01");
  assert.equal(cleanDate("2026-13-45"), "");
  assert.equal(cleanDate("어제"), "");
  assert.equal(todayKst(Date.parse("2026-11-14T15:30:00Z")), "2026-11-15"); // 한국은 이미 다음 날
});
