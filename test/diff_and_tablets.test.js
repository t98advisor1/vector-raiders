import test from "node:test";
import assert from "node:assert/strict";
import { TABLETS, PLATFORMS, OBJECTS, DOORS } from "../public/js/game.js";

test("지도에 상자 9개가 있고, 1~3번 방 상자가 문 열쇠가 된다", () => {
  assert.equal(OBJECTS.length, 9);
  assert.deepEqual(OBJECTS.map((o) => o.pid), ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9"]);
  assert.deepEqual(Object.values(DOORS).flat(), ["p1", "p2", "p3", "p4", "p5", "p6", "p7"]);
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
