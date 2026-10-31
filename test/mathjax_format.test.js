// 문항·풀이·보기·조건·조작 안내·핵심 카드의 모든 수식이 MathJax 수식(\( … \))으로 바뀌는지 검사한다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSet } from "../src/setfile.js";
import { fmt } from "../public/js/mathtext.js";

const LEFTOVER = /[A-Za-z√πθ°²³₀₁₂₃∥⊥⟺⇔≠≤≥±·×|=]/;
const files = fs.readdirSync(new URL("../content/sets/", import.meta.url)).filter((f) => f.endsWith(".md"));

for (const file of files) {
  test(`${file}: 글 속의 수식 기호가 모두 MathJax로 조판된다`, () => {
    const set = parseSet(fs.readFileSync(new URL(`../content/sets/${file}`, import.meta.url), "utf8"));
    const texts = [];
    for (const b of set.boxes) {
      texts.push(b.howto);
      for (const lv of Object.values(b.levels)) texts.push(lv.text, lv.hint, lv.howto, ...lv.options, ...lv.conditions.map((c) => c.text));
    }
    for (const c of set.cards) texts.push(c.title, c.summary, ...c.points);
    const problems = [];
    for (const t of texts.filter(Boolean)) {
      const html = fmt(t);
      // 수식 밖에 남은 글자
      const outside = html.replace(/\\\(.*?\\\)/gs, "").replace(/&[a-z]+;/g, "");
      if (LEFTOVER.test(outside)) problems.push(`수식 밖 기호: ${outside.match(LEFTOVER)[0]} ← ${t.slice(0, 60)}`);
      // 수식 안의 중괄호 짝
      for (const m of html.matchAll(/\\\((.*?)\\\)/gs)) {
        const open = (m[1].match(/\{/g) ?? []).length, close = (m[1].match(/\}/g) ?? []).length;
        if (open !== close) problems.push(`중괄호 짝이 안 맞음: ${m[1]}`);
      }
    }
    assert.deepEqual(problems, []);
  });
}
