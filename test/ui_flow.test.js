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

test("팀전 6채널·개인전 6채널과 A·B·C 세 팀, 이름과 닉네임 입력", () => {
  const html = fs.readFileSync("public/index.html", "utf8");
  for (let n = 1; n <= 6; n++) {
    assert.equal(html.includes(`data-ch="${n}"`), true, `팀전 ${n}채널 버튼`);
    assert.equal(html.includes(`data-ch="s${n}"`), true, `개인전 ${n}채널 버튼`);
  }
  assert.equal(html.includes('data-ch="7"'), false, "7채널은 없다");
  for (const team of ["A", "B", "C"]) assert.equal(html.includes(`data-team="${team}"`), true, `${team}팀 버튼`);
  assert.equal(html.includes('data-team="D"'), false, "D팀은 없다");
  assert.match(html, /id="join-nick"/);
  for (const unit of ["3-1", "3-2", "3-3"]) assert.equal(html.includes(`data-unit="${unit}"`), true, `${unit} 단원 버튼`);
  const studentJs = fs.readFileSync("public/js/student.js", "utf8");
  for (const diff of ["low", "mid", "high"]) assert.equal(studentJs.includes(`data-pdiff="${diff}"`), true, `${diff} 난이도 버튼`);
  for (let k = 1; k <= 4; k++) assert.equal(html.includes(`data-slide="${k}"`), true, `${k}번 설명서 슬라이드`);
  const worker = fs.readFileSync("src/worker.js", "utf8");
  assert.ok(worker.includes("const CH_RE = /^([1-6]|s[1-6])$/;"), "팀전 1~6·개인전 s1~s6 채널");
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.ok(room.includes(`const TEAMS = ["A", "B", "C"];`));
  assert.ok(room.includes("const MAX_STUDENTS = TEAMS.length * MAX_TEAM_SIZE;")); // 팀전 24명
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
  assert.match(room, /if \(this\.practice\) return;\n\s*const done = this\.data\.stage === "done";[\s\S]{0,200}if \(!done && !st\.escapedAt && !msg\.partial\) return;/);
});

test("모든 방을 탈출한 학생은 탐험 중에도 자기 난이도 정답만 받아 풀이 기록을 출력한다", () => {
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.match(room, /mineOnly/);
  const stu = fs.readFileSync("public/js/student.js", "utf8");
  assert.match(stu, /id="mine-btn"/);
  assert.match(stu, /S\.cls\?\.stage === "done" \|\| iEscaped\(\)/);
});

test("파일 업로드 기능은 없다 (문항 세트 md·그림 파일)", () => {
  const html = fs.readFileSync("public/teacher.html", "utf8");
  assert.doesNotMatch(html, /type="file"/);
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.doesNotMatch(room, /uploadSet|uploadImage|checkImage|imgput|setput/);
  const worker = fs.readFileSync("src/worker.js", "utf8");
  assert.ok(!worker.includes("/img/"), "그림 파일 주소(/img/…)를 받지 않는다");
  const t = fs.readFileSync("public/js/teacher.js", "utf8");
  assert.doesNotMatch(t, /uploadSet|uploadImage|toWebp/);
  const man = fs.readFileSync("public/js/manual.js", "utf8");
  assert.doesNotMatch(man, /part: "make"/);
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

test("사용 설명서가 쓰는 모의 진행 그림이 모두 있다", () => {
  const src = fs.readFileSync("public/js/manual.js", "utf8");
  const names = [...src.matchAll(/\["([a-z]-[a-z-]+)", "/g)].map((m) => m[1]);
  assert.ok(names.length >= 15, `그림 ${names.length}개`);
  for (const n of names) assert.ok(fs.existsSync(`public/img/manual/${n}.webp`), `${n}.webp`);
});

test("협업 짝 정보는 저장소에 남고, 다시 열면 같은 조건을 다시 받는다 (4인 모의 진행 B팀 사례)", () => {
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.match(room, /this\.data\.coop \?\?= \{ wait: \{\}, pairs: \{\}, solo: \[\] \}/);
  assert.doesNotMatch(room, /this\.coop\b(?!Ready)/);
  assert.match(room, /if \(pair\?\.includes\(cid\)\) \{\n\s*const mate = [^\n]+\n\s*return this\.send\(ws, \{ type: "coop"/);
  const css = fs.readFileSync("public/css/style.css", "utf8");
  assert.match(css, /\.chat-toggle, \.chat-panel \{ z-index: 60; \}/);
  const stu = fs.readFileSync("public/js/student.js", "utf8");
  assert.doesNotMatch(stu, /문제는 같고 배점만 달라요/);
  const game = fs.readFileSync("public/js/game.js", "utf8");
  assert.match(game, /BIAS = \{ bridge: -1\.0, tablet: 0\.4 \}/);
});

test("중간에 나가기: 수업 중 내가 푼 문제의 정답만 받아 학습 자료를 출력한다", () => {
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.match(room, /d && st\.probs\[pid\]\?\.solved \? \{ \[d\]: v\[d\] \} : \{\}/); // 안 푼 문제 정답은 빠진다
  const stu = fs.readFileSync("public/js/student.js", "utf8");
  assert.match(stu, /type: "review", partial: true/);
  assert.match(stu, /function printMyCards/);
  const html = fs.readFileSync("public/index.html", "utf8");
  assert.match(html, /id="exit-btn"/);
});

test("완주 선물: 게임마다 관상·타로 중 하나만 고르고, 다음 게임에서는 지난번 선물이 잠긴다", () => {
  const stu = fs.readFileSync("public/js/student.js", "utf8");
  assert.ok(stu.includes('url: "https://kwansang.vercel.app/"') && stu.includes('url: "https://starlight-tarot-3d.vercel.app/"'));
  // 게임 하나 = 방이 열린 동안(endsAt), 연습은 '처음부터 다시'마다 새 게임
  assert.ok(stu.includes("const gameId = () => `${S.cls?.endsAt ?? \"\"}"));
  assert.ok(stu.includes("-${gameId()}`;"));
  assert.ok(stu.includes('store("vr-practice-round", (Number(store("vr-practice-round")) || 0) + 1)'));
  // 이번 게임에서 고르면 다른 선물은 닫히고, 지난 게임의 선물은 잠긴다
  assert.ok(stu.includes("const off = picked ? picked !== k : locked === k;"));
  assert.ok(stu.includes("return last && last.game !== rewardKey() && GIFTS[last.gift] ? last.gift : null;"));
  assert.ok(stu.includes("saveReward({ ...rewardState(), gift: a.dataset.gift });"));
  assert.ok(stu.includes("store(lastGiftKey(), { game: rewardKey(), gift: a.dataset.gift });"));
  assert.ok(stu.includes('target="_blank" rel="noopener"'));
  assert.ok(stu.includes('${S.spectator ? "" : `<div class="reward-box">')); // 관람자는 선물 없음
});

test("완주 선물: 소감과 형성평가 자료 4가지를 모두 받아야 선물이 열린다", () => {
  const stu = fs.readFileSync("public/js/student.js", "utf8");
  for (const k of ["feel", "sheet", "answer", "mine", "review"]) assert.match(stu, new RegExp(`\\["${k}", `));
  assert.match(stu, /REWARD_STEPS\.every\(\(\[k\]\) => r\[k\]\)/);
  assert.match(stu, /localStorage\.setItem\("vr-cookie"/);
  const gw = fs.readFileSync("public/gwansang.html", "utf8");
  assert.match(gw, /localStorage\.getItem\("vr-cookie"\)/);
  assert.match(gw, /opacity: 0\.30;/);
  assert.match(gw, /og:image" content="https:\/\/go\.geomath\.workers\.dev\/img\/reward\/gwansang-og\.jpg"/);
  assert.doesNotMatch(gw, /data:image\/[a-z]+;base64/); // 큰 내장 그림 대신 파일
  assert.ok(fs.existsSync("public/img/reward/gwansang.webp") && fs.existsSync("public/img/reward/gwansang-og.jpg"));
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.match(room, /msg\.type === "reflection"/);
});

test("연습 모드는 기본 세트 중에서 고른다", () => {
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.ok(room.includes(`practiceSetId(msg) { return typeof msg.setId === "string" && builtinSet(msg.setId)`));
  const worker = fs.readFileSync("src/worker.js", "utf8");
  assert.ok(worker.includes("/api/practice-sets"));
  const stu = fs.readFileSync("public/js/student.js", "utf8");
  assert.match(stu, /setId: mode === "practice"/);
});
test("교사용 형성평가 답지에도 문제와 그림이 들어간다", () => {
  const t = fs.readFileSync("public/js/teacher.js", "utf8");
  assert.match(t, /return `<section class="fa-item">\$\{head\}\$\{q\}<p class="pr-answer">/);
});

test("배경음악: 첫 화면·대기는 예전 음악, 탐험이 시작되면 기·승·전·결·맺음 음악", () => {
  const snd = fs.readFileSync("public/js/sound.js", "utf8");
  for (const n of ["기", "승", "전", "결", "맺음"]) assert.match(snd, new RegExp(`name: "${n}"`));
  assert.match(snd, /part === "rest"/);
  assert.ok(snd.includes(`ending() { this.ended = true; this.intensity = 4; this.setTrack("story"); }`));
  assert.ok(snd.includes(`this.track = "classic";`));
  assert.ok(snd.includes("playClassic(s, t) {"));
  const stu = fs.readFileSync("public/js/student.js", "utf8");
  assert.ok(stu.includes(`sound.setTrack(stage === "lobby" ? "classic" : "story");`));
});

test("모든 방은 60분 뒤 끝나고, 팀전 결과표만 교사에게 자동으로 간다", () => {
  const room = fs.readFileSync("src/room.js", "utf8");
  assert.ok(room.includes("export const ROOM_LIFE_MS = 60 * 60 * 1000;"));
  assert.ok(room.includes("await this.openRoom(); // 첫 학생이 들어오면"));
  assert.ok(room.includes(`if (!this.practice && !this.solo && Object.keys(this.data.students).length) {\n      const result = { type: "finalResult"`));
  assert.ok(room.includes(`ws.close(4010, "room expired")`));
  const t = fs.readFileSync("public/js/teacher.js", "utf8");
  assert.match(t, /msg\.type === "finalResult"[\s\S]{0,300}downloadCsv\(msg\.dashboard/);
  const stu = fs.readFileSync("public/js/student.js", "utf8");
  assert.ok(stu.includes("4010:"));
  assert.ok(stu.includes("function renderTimer()"));
});

test("개인전: 8명, 관람 포함 15명, 먼저 들어온 학생이 방장", () => {
  const room = fs.readFileSync("src/room.js", "utf8");
  for (const s of ["const SOLO_PLAYERS = 8;", "const SOLO_PEOPLE = 15;", "if (this.solo) this.data.host ??= cid;",
    `if (this.hostCid() !== cid) return this.send(ws, { type: "error", message: "방장만`, "return this.joinSpectator(ws, cid, nick)"]) {
    assert.ok(room.includes(s), s);
  }
});

test("랭킹·채팅은 닉네임, 교사 화면은 닉네임 (이름)", () => {
  const room = fs.readFileSync("src/room.js", "utf8");
  for (const s of ["players: students.map((st) => [st.n, nickOf(st), st.team ?? null])", "cid, n: st.n, name: nickOf(st), solved", "realName: st.name"]) {
    assert.ok(room.includes(s), s);
  }
  const t = fs.readFileSync("public/js/teacher.js", "utf8");
  assert.ok(t.includes("const who = (st) => (st.nick && st.nick !== st.name ? `${st.nick} (${st.name})` : st.name);"));
});
test("연습 모드도 모든 방을 탈출하면 결과 창이 열리고, 소감을 쓰면 선물을 고를 수 있다", () => {
  const stu = fs.readFileSync("public/js/student.js", "utf8");
  assert.match(stu, /S\.mode === "practice" && !wasDone && iEscaped\(\)/);
  assert.match(stu, /S\.mode === "practice" \? !!r\.feel : REWARD_STEPS\.every/);
  assert.match(stu, /vr-reward-\$\{S\.mode\}/); // 수업·연습 보상 기록을 따로 둔다
});

test("배경음악은 같은 장을 다시 돌 때마다 조금씩 바뀐다", () => {
  const snd = fs.readFileSync("public/js/sound.js", "utf8");
  assert.match(snd, /this\.cycle = \(this\.cycle \?\? 0\) \+ 1/);
  assert.match(snd, /const shift = \[0, 2, -2, 3\]\[cyc % 4\]/);
});
