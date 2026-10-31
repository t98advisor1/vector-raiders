import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("교사용 화면(teacher.html)에 비밀번호가 평문으로 노출되지 않는다", () => {
  const html = fs.readFileSync("public/teacher.html", "utf8");
  assert.equal(html.includes("119-129"), false, "119-129 비밀번호가 teacher.html에 노출되면 안 됨");
  assert.equal(html.includes("82821"), false, "82821 비밀번호가 teacher.html에 노출되면 안 됨");
  assert.equal(html.includes("admin-guide-card"), false, "admin-guide-card가 남아있으면 안 됨");
});

test("학생 화면(index.html)에 4단계 위저드와 지도보기 버튼이 정상 구성되어 있다", () => {
  const html = fs.readFileSync("public/index.html", "utf8");
  assert.equal(html.includes('id="step-ch"'), true, "1단계 채널 선택 컨테이너 존재");
  assert.equal(html.includes('id="step-team"'), true, "2단계 팀 선택 컨테이너 존재");
  assert.equal(html.includes('id="step-unit"'), true, "3단계 단원 선택 컨테이너 존재");
  assert.equal(html.includes('id="step-launch"'), true, "4단계 난이도/이름 컨테이너 존재");
  assert.equal(html.includes("🗺️ 지도보기"), true, "지도보기 버튼 레이블 존재");
});

test("채널 선택 및 팀 선택 분리 버튼 7개 및 4개 팀 구성 검증", () => {
  const html = fs.readFileSync("public/index.html", "utf8");

  // 7개 채널 카드 버튼
  for (let ch = 1; ch <= 7; ch++) {
    assert.equal(html.includes(`data-ch="${ch}"`), true, `${ch}채널 버튼 존재`);
  }

  // 4개 팀 카드 버튼
  for (const team of ["A", "B", "C", "D"]) {
    assert.equal(html.includes(`data-team="${team}"`), true, `${team}팀 버튼 존재`);
  }

  // 2022 개정 기하 3개 단원
  for (const unit of ["3-1", "3-2", "3-3"]) {
    assert.equal(html.includes(`data-unit="${unit}"`), true, `${unit} 단원 버튼 존재`);
  }

  // 문제 창 3개 난이도 토글 버튼 (입장 단계 대신 문제 모달에서 직접 선택)
  const studentJs = fs.readFileSync("public/js/student.js", "utf8");
  for (const diff of ["low", "mid", "high"]) {
    assert.equal(studentJs.includes(`data-pdiff="${diff}"`), true, `${diff} 난이도 문제 선택 버튼 존재`);
  }

  // 캐러셀 설명서 슬라이드 4개
  for (let s = 1; s <= 4; s++) {
    assert.equal(html.includes(`data-slide="${s}"`), true, `${s}번 설명서 슬라이드 존재`);
  }
});
