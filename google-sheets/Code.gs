/**
 * 벡터 유적 탈출 → 구글 시트 기록 받기
 *
 * 설치 방법 (README의 '구글 시트 연동'에 그림 없이 순서대로 적혀 있어요)
 * 1. 새 구글 시트를 만들고 [확장 프로그램] → [Apps Script]를 엽니다.
 * 2. 이 파일 내용을 모두 붙여 넣고, 아래 SECRET을 아무도 모르는 긴 글자로 바꾼 뒤 저장합니다.
 * 3. [배포] → [새 배포] → 유형 '웹 앱', 실행 사용자 '나', 액세스 권한 '모든 사용자'로 배포합니다.
 * 4. 나온 웹 앱 주소와 SECRET을 게임 서버의 SHEETS_WEBHOOK_URL, SHEETS_SECRET에 넣습니다.
 *
 * 주소를 아는 사람은 누구나 요청을 보낼 수 있지만, SECRET이 맞아야만 시트에 기록됩니다.
 */
const SECRET = "여기를-아무도-모르는-긴-글자로-바꾸세요";

const LOG_SHEET = "기록";
const LOG_HEAD = ["시각", "이름", "종류", "문제", "답", "결과", "시도", "내용"];
const SUM_SHEET = "학생별 요약";
const SUM_HEAD = ["순위", "이름", "점수", "맞힌 문제", "힌트", "벡터 점프", "처음 접속", "마지막 접속", "탈출 시각", "접속 중", "학생 ID"];

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: "bad json" });
  }
  if (body.secret !== SECRET) return reply({ ok: false, error: "forbidden" });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    writeEvents(ss, body.events || []);
    if (body.clearSummary) clearSummary(ss);
    if (body.summaries) writeSummaries(ss, body.summaries);
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

// 웹 앱 주소를 브라우저로 열었을 때 연결 확인용
function doGet() {
  return reply({ ok: true, message: "벡터 유적 탈출 기록 받기 준비 완료" });
}

function writeEvents(ss, events) {
  if (!events.length) return;
  const sh = sheet(ss, LOG_SHEET, LOG_HEAD);
  const rows = events.map((ev) => [
    toDate(ev.time), ev.name || "", ev.type || "", ev.problem || "", ev.answer || "",
    ev.result || "", ev.tries || "", ev.detail || "",
  ]);
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, LOG_HEAD.length).setValues(rows);
}

// 학생 ID로 줄을 찾아 고치고, 없으면 새 줄을 붙인 뒤 순위대로 정렬한다.
function writeSummaries(ss, summaries) {
  const sh = sheet(ss, SUM_SHEET, SUM_HEAD);
  const idCol = SUM_HEAD.length;
  const last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, idCol, last - 1, 1).getValues().map((r) => r[0]) : [];
  summaries.forEach((s) => {
    const row = [
      s.rank, s.name, s.score, s.solved, s.hints, s.lab,
      toDate(s.firstJoin), toDate(s.lastSeen), toDate(s.escapedAt), s.online ? "🟢" : "", s.id,
    ];
    const i = ids.indexOf(s.id);
    if (i >= 0) {
      sh.getRange(i + 2, 1, 1, row.length).setValues([row]);
    } else {
      sh.appendRow(row);
      ids.push(s.id);
    }
  });
  if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, idCol).sort(1);
}

function clearSummary(ss) {
  const sh = sheet(ss, SUM_SHEET, SUM_HEAD);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, SUM_HEAD.length).clearContent();
}

function sheet(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight("bold").setBackground("#fef3c7");
    sh.setFrozenRows(1);
  }
  return sh;
}

function toDate(iso) {
  return iso ? new Date(iso) : "";
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
