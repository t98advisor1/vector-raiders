// 지도·배치 검사: 10대 기능 고도화로 넓힌 방과 새로 놓은 발판·표적이 규칙에 맞는지 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import { W, H, buildGrid, PLATFORMS, TARGETS, OBJECTS, ALTAR, BRIDGES, DOOR_COLS, SPAWN } from "../public/js/game.js";

test("지도 크기와 벽 테두리", () => {
  const g = buildGrid();
  assert.equal(g.length, H);
  assert.equal(g[0].length, W);
  for (let x = 0; x < W; x++) { assert.equal(g[0][x], "#"); assert.equal(g[H - 1][x], "#"); }
  for (let y = 0; y < H; y++) { assert.equal(g[y][0], "#"); assert.equal(g[y][W - 1], "#"); }
});

test("발판은 바닥 칸에 있고 높이는 오를 수 있는 범위다", () => {
  const g = buildGrid();
  for (const [key, ph] of PLATFORMS) {
    const [x, y] = key.split(",").map(Number);
    assert.equal(g[y][x], ".", `발판 (${x},${y})는 바닥 칸이어야 해요: ${g[y][x]}`);
    assert.ok(ph > 0 && ph <= 2.4, `발판 높이 ${ph}는 0 < h ≤ 2.4`);
  }
});

test("표적·상자·제단·출발점은 벽·위험지대·발판이 아닌 칸에 있다", () => {
  const g = buildGrid();
  for (const t of TARGETS) {
    const ch = g[t.y][t.x];
    assert.ok(!"#!^~o@".includes(ch), `표적 ${t.zone} (${t.x},${t.y}) 칸이 이상해요: ${ch}`);
  }
  for (const o of OBJECTS) assert.equal(g[o.y][o.x], "o");
  assert.equal(g[ALTAR.y][ALTAR.x], "@");
  assert.notEqual(g[Math.floor(SPAWN[1])][Math.floor(SPAWN[0])], "#");
});

test("문·다리가 격자에 새겨져 있다", () => {
  const g = buildGrid();
  for (const [id, col] of Object.entries(DOOR_COLS)) for (const r of [6, 7, 8]) assert.equal(g[r][col], id);
  for (const [bid, br] of Object.entries(BRIDGES)) assert.equal(g[br.cy][br.cx], bid);
});
