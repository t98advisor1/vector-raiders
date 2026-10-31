// 문항 세트의 모든 문항을 채점기로 점검한다: 정답은 맞게, 오답은 틀리게.
// 그리고 학생 화면이 세트를 읽어 상자 9개 × 하·중·상으로 바꾸는지 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSet, parseVecExpr } from "../src/setfile.js";
import { gradeLevel, answerText } from "../src/answers.js";
import { evaluate } from "../src/mathexpr.js";
import { PROBLEMS, loadSet } from "../public/js/problems.js";

const SETS = fs.readdirSync(new URL("../content/sets/", import.meta.url)).filter((f) => f.endsWith(".md"));
const LV = ["low", "mid", "high"];

const correctInput = (lv) => lv.kind === "set" ? lv.answer.split(",").map((s) => s.trim()) : lv.kind === "choice" ? lv.answer.match(/\d/)[0] : lv.answer;
const wrongInput = (lv) => {
  if (lv.kind === "set") return [...correctInput(lv), lv.options.find((o) => !correctInput(lv).includes(o))].filter(Boolean);
  if (lv.kind === "choice") return String((Number(correctInput(lv)) % 5) + 1);
  if (lv.kind === "vec") { const c = parseVecExpr(lv.answer); return Object.entries({ ...c, a: (c.a ?? 0) + 1 }).map(([k, v]) => `${v >= 0 ? "+" : ""}${v}${k}`).join(""); }
  return String(evaluate(lv.answer) + 1);
};

for (const file of SETS) {
  const set = parseSet(fs.readFileSync(new URL(`../content/sets/${file}`, import.meta.url), "utf8"));

  test(`${file}: 형식 오류 없이 상자 9개 × 하·중·상`, () => {
    assert.deepEqual(set.errors, []);
    assert.equal(set.boxes.length, 9);
    for (const b of set.boxes) for (const k of LV) {
      const lv = b.levels[k];
      assert.ok(lv.text.length > 10, `상자 ${b.no} ${k} 본문`);
      assert.ok(answerText(lv), `상자 ${b.no} ${k} 정답 글자`);
      if (lv.kind === "choice") assert.equal(lv.options.length, 5, `상자 ${b.no} ${k} 오지선다`);
      if (lv.kind === "set") for (const a of correctInput(lv)) assert.ok(lv.options.includes(a), `상자 ${b.no} ${k} 정답 ${a}이 보기에 있다`);
      // 협업은 3·4번 방 상자의 '상'만
      assert.equal(lv.conditions.length > 0, b.coop && k === "high", `상자 ${b.no} ${k} 협업 조건`);
    }
  });

  test(`${file}: 모든 문항이 정답은 맞게, 오답은 틀리게 채점된다`, () => {
    for (const b of set.boxes) for (const k of LV) {
      const lv = b.levels[k];
      assert.equal(gradeLevel(lv, correctInput(lv))?.ok, true, `상자 ${b.no} ${k} 정답 ${JSON.stringify(correctInput(lv))}`);
      assert.equal(gradeLevel(lv, wrongInput(lv))?.ok, false, `상자 ${b.no} ${k} 오답 ${JSON.stringify(wrongInput(lv))}`);
    }
  });

  test(`${file}: 학생 화면이 세트를 문제 목록으로 바꾼다`, () => {
    loadSet({ id: file, meta: set.meta, cards: set.cards, boxes: set.boxes.map((b) => ({ ...b, levels: Object.fromEntries(LV.map((k) => [k, { ...b.levels[k], coop: b.coop && k === "high" }])) })) });
    assert.equal(PROBLEMS.length, 9);
    assert.deepEqual(PROBLEMS.map((p) => p.id), ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9"]);
    for (const p of PROBLEMS) for (const k of LV) assert.ok(["expr", "choice", "multi"].includes(p.diffs[k].answer.kind));
  });
}

test("채점기: 벡터식·오지선다 표기를 너그럽게 받는다", () => {
  const vec = { kind: "vec", answer: "3/2a+b" };
  for (const ok of ["3/2a+b", "1.5a + b", "b+3/2a", "1.5a+1b"]) assert.equal(gradeLevel(vec, ok)?.ok, true, ok);
  assert.equal(gradeLevel(vec, "3a+b")?.ok, false);
  assert.equal(gradeLevel(vec, "hello"), null);
  const ch = { kind: "choice", answer: "2", options: ["①", "②", "③", "④", "⑤"] };
  assert.equal(gradeLevel(ch, "2")?.ok, true);
  assert.equal(gradeLevel(ch, "②")?.ok, true);
  const num = { kind: "num", answer: "2√2" };
  assert.equal(gradeLevel(num, "√8")?.ok, true);
  assert.equal(gradeLevel(num, "2.83")?.ok, false);
});
