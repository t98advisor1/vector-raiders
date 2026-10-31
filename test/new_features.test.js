import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CONCEPT_TABLES } from "../public/js/concepts.js";

test("팀 선택에 동물 수식어 없이 깔끔한 A팀, B팀, C팀, D팀만 존재한다", () => {
  const html = fs.readFileSync("public/index.html", "utf-8");
  assert.ok(html.includes("<b>A팀</b>"));
  assert.ok(html.includes("<b>B팀</b>"));
  assert.ok(html.includes("<b>C팀</b>"));
  assert.ok(html.includes("<b>D팀</b>"));
  assert.ok(!html.includes("A팀 (여우)"));
  assert.ok(!html.includes("B팀 (고양이)"));
  assert.ok(!html.includes("C팀 (곰)"));
  assert.ok(!html.includes("D팀 (토끼)"));
});

test("모든 10개 핵심 개념에 교과서 공식 정리 표(CONCEPT_TABLES)가 완비되어 있다", () => {
  const keys = ["l1", "l2", "l3", "p1", "p2", "p3", "p4", "p5", "p6", "p7"];
  for (const k of keys) {
    const tbl = CONCEPT_TABLES[k];
    assert.ok(tbl, `개념 ${k}에 정리 표가 있어야 합니다.`);
    assert.ok(tbl.headers && tbl.headers.length === 3);
    assert.ok(tbl.rows && tbl.rows.length >= 3);
  }
});

test("지도보기에 4개 범례(개념 비석, 문제 상자, 수학사 비석, 나/팀원)가 완비되어 있다", () => {
  const html = fs.readFileSync("public/index.html", "utf-8");
  assert.ok(html.includes("📖 개념 비석"));
  assert.ok(html.includes("⚔️ 문제 상자"));
  assert.ok(html.includes("🏛️ 수학사 비석"));
  assert.ok(html.includes("🟢 나 & 팀원"));
});

test("world3d.js에 캐릭터 전방 120도 탐험 후레시(SpotLight)가 구현되어 있다", () => {
  const code = fs.readFileSync("public/js/world3d.js", "utf-8");
  assert.ok(code.includes("this.flashlight = new THREE.SpotLight"));
  assert.ok(code.includes("MathUtils.degToRad(60)"));
});
