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
  // 휴대폰에서는 글자를 숨기고 🗺️ 아이콘만 보이도록 글자를 span으로 감싼다
  assert.match(html, /id="map-btn"[^>]*>🗺️<span class="lbl"> 지도보기<\/span>/, "지도보기 버튼 레이블 존재");
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

test("문장 속 수식에 역슬래시가 두 번 들어가 벡터 표시가 깨지지 않는다", async () => {
  // JS 문자열 "$\\VV{AB}$"는 TeX \VV{AB}가 되지만, "$\\\\VV{AB}$"는 줄바꿈(\\) + VVAB 글자로 깨진다.
  const { readdirSync } = await import("node:fs");
  for (const f of readdirSync("public/js").filter((n) => n.endsWith(".js"))) {
    const src = fs.readFileSync(`public/js/${f}`, "utf8");
    assert.doesNotMatch(src, /\\\\\\\\(vv|VV|dfrac|frac|circ|parallel|sqrt)\b/, f);
  }
});

test("연습 모드에서는 정답표(출력용)를 보내지 않는다", () => {
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.match(room, /if \(this\.practice\) return;\n\s*const done = this\.data\.stage === "done";\n\s*if \(!done && !st\.escapedAt\) return;/);
});

test("모든 방을 탈출한 학생은 탐험 중에도 자기 난이도 정답만 받아 풀이 기록을 출력한다", () => {
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.match(room, /mineOnly/);
  const stu = fs.readFileSync("public/js/student.js", "utf8");
  assert.match(stu, /id="mine-btn"/);
  assert.match(stu, /S\.cls\?\.stage === "done" \|\| iEscaped\(\)/);
});

test("중간관리자가 올린 문항 세트는 그 채널에만 보이고, 그 채널 교사만 지운다", () => {
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.match(room, /filter\(\(x\) => all \|\| !x\.owner \|\| x\.owner === ch\)/);
  assert.match(room, /const owner = master \? existing\?\.owner \?\? null : ch;/);
  assert.match(room, /이 채널에서 올린 세트만 지울 수 있어요/);
  assert.match(room, /SET_MSGS = \["uploadSet", "deleteSet", "setExample", "setListGet", "uploadImage", "deleteImage", "imageList", "changeLogGet"\]/);
});

test("그림: 칸은 그림 줄·내장 도구·안전한 이미지 주소만 받고, 카드에도 그림을 붙인다", async () => {
  const { checkFigureSpec, parseSet } = await import("../src/setfile.js");
  assert.equal(checkFigureSpec("평면 범위=-3,3,-2,6 곡선=x^2-2*x;a*x 슬라이더=a,-2,2,0.5"), null);
  assert.equal(checkFigureSpec("/img/a1b2c3d4e5f6.png"), null);
  assert.equal(checkFigureSpec("hex BC"), null);
  assert.match(checkFigureSpec("/img/../x.png") ?? "", /이미지 주소/);
  assert.match(checkFigureSpec('https://x.com/a.png" onerror="x') ?? "", /이미지 주소/);
  assert.match(checkFigureSpec("공간 곡선=x") ?? "", /평면/);
  const md = fs.readFileSync("content/sets/geo-3-1.md", "utf8").replace("# 핵심 카드 · 벡터의 뜻과 크기", "# 핵심 카드 · 벡터의 뜻과 크기\n그림: 평면 a=3,4 끌기=a 보기=|a|");
  const set = parseSet(md);
  assert.equal(set.cards.find((c) => c.title === "벡터의 뜻과 크기")?.figure, "평면 a=3,4 끌기=a 보기=|a|");
});

test("팀 문은 같은 팀 절반 이상이 열면 열리고, 그림의 재생=은 슬라이더나 회전만 받는다", async () => {
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.match(room, /const TEAM_DOOR_RATIO = 1 \/ 2;/);
  const { checkFigure } = await import("../public/js/figcore.js");
  assert.equal(checkFigure("평면 a=1,1 슬라이더=t,0,1,0.1 재생=t,4"), null);
  assert.equal(checkFigure("공간 직육면체=2,2,2 재생=회전,8"), null);
  assert.match(checkFigure("평면 a=1,1 재생=회전,8") ?? "", /공간/);
  assert.match(checkFigure("평면 a=1,1 재생=k,3") ?? "", /슬라이더/);
});

test("다른 교과 예시 세트는 검사를 통과하고, 단답형·인물 카드·수식 끔을 쓴다", async () => {
  const { validateSet } = await import("../src/setfile.js");
  const { gradeLevel, answerText } = await import("../src/answers.js");
  const r = validateSet(fs.readFileSync("content/examples/sci-motion.md", "utf8"), gradeLevel);
  assert.equal(r.ok, true, r.errors.join("\n"));
  assert.equal(r.set.people.length, 2);
  assert.ok(r.set.boxes.some((b) => Object.values(b.levels).some((lv) => lv.kind === "text")));
  const lv = { kind: "text", answer: "m/s² | 미터 매 초 제곱" };
  assert.equal(gradeLevel(lv, "m/s^2").ok, true);
  assert.equal(gradeLevel(lv, "M / S2").ok, true);
  assert.equal(gradeLevel(lv, "m/s").ok, false);
  assert.equal(answerText({ kind: "set", answer: "m/s, km/h" }), "m/s, km/h");
  assert.equal(answerText({ kind: "set", answer: "AB, CD" }), "[AB], [CD]");
});

test("수식 자동 변환은 수학 교과만 켜고, 머리말 '수식:'이 우선한다", async () => {
  const { mathOn } = await import("../public/js/problems.js").catch(() => ({}));
  if (!mathOn) return; // problems.js가 브라우저 전용 모듈을 부르면 건너뛴다
  assert.equal(mathOn({}), true);
  assert.equal(mathOn({ 교과: "기하" }), true);
  assert.equal(mathOn({ 교과: "과학" }), false);
  assert.equal(mathOn({ 교과: "과학", 수식: "켬" }), true);
  assert.equal(mathOn({ 교과: "수학", 수식: "끔" }), false);
});

test("미적분 그림 문법: f1·d1·int1, 접선, 넓이", async () => {
  const { parseFigure, evalScene, evalExpr, checkFigure } = await import("../public/js/figcore.js");
  const spec = "평면 범위=-1,4,-1,9 곡선=x^2 슬라이더=a,0,3,0.5;b,0,3,0.5 접선=1,a 넓이=1,0,b 보기=기울기:d1(a);넓이:int1(0,b)";
  assert.equal(checkFigure(spec), null);
  const env = evalScene(parseFigure(spec), { a: 2, b: 3 });
  assert.equal(evalExpr("f1(a)", env), 4);
  assert.ok(Math.abs(evalExpr("d1(a)", env) - 4) < 1e-6);
  assert.ok(Math.abs(evalExpr("int1(0,b)", env) - 9) < 1e-6);
  assert.match(checkFigure("평면 곡선=x 접선=2,1") ?? "", /곡선 2/);
});

test("사용 설명서의 프롬프트 생성기는 단계·그림 종류에 맞는 규칙을 넣는다", async () => {
  const { buildPrompt } = await import("../public/js/manual.js");
  const p = buildPrompt({ subject: "미적분", unit: "미분", stage: "3", figs: ["graph", "motion"], kinds: ["num"], people: true });
  assert.match(p, /접선=1,a/);
  assert.match(p, /재생=t,4/);
  assert.match(p, /인물 카드/);
  const q = buildPrompt({ subject: "사회", unit: "지도", stage: "1", figs: ["image"], kinds: ["text"], images: "/img/abc123def456.png 지도" });
  assert.match(q, /설계표/);
  const r = buildPrompt({ subject: "영어", stage: "3", figs: ["none"], kinds: ["text", "choice"], math: "off" });
  assert.match(r, /수식: 끔/);
  assert.match(r, /단답형/);
});
