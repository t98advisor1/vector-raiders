// 구글 시트로 수업 기록 보내기 (선택 기능).
// 비밀 값 SHEETS_WEBHOOK_URL(구글 Apps Script 웹 앱 주소)과 SHEETS_SECRET이 있을 때만 동작한다.
// 기록은 3초마다 모아서 보내고, 실패하면 잠시 뒤 다시 보낸다. 시트 쪽 코드는 google-sheets/Code.gs.
const FLUSH_MS = 3000;
const MAX_QUEUE = 2000;
const MAX_FAILURES = 30;

export class SheetLog {
  // snapshot(): 지금 학생별 요약 행 목록을 돌려주는 함수
  constructor(env, snapshot) {
    this.url = env.SHEETS_WEBHOOK_URL;
    this.secret = env.SHEETS_SECRET;
    this.snapshot = snapshot;
    this.events = [];
    this.summaryDirty = false;
    this.clearSummary = false;
    this.timer = null;
    this.sending = false;
    this.failures = 0;
  }

  get enabled() { return Boolean(this.url && this.secret); }

  // 한 줄 기록: { type, name?, problem?, answer?, result?, tries?, detail? }
  event(row) {
    if (!this.enabled) return;
    this.events.push({ time: new Date().toISOString(), ...row });
    if (this.events.length > MAX_QUEUE) this.events.splice(0, this.events.length - MAX_QUEUE);
    this.summaryDirty = true;
    this.schedule();
  }

  // 점수·접속 상태가 바뀌었음을 알린다. 보낼 때 학생 전체 요약을 새로 만든다.
  touch() {
    if (!this.enabled) return;
    this.summaryDirty = true;
    this.schedule();
  }

  // 새 수업: 시트의 '학생별 요약'을 비운다('기록'은 남긴다).
  newClass() {
    if (!this.enabled) return;
    this.clearSummary = true;
    this.event({ type: "새 수업 시작", name: "교사" });
  }

  schedule(delay = FLUSH_MS) {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, delay);
  }

  async flush() {
    if (this.sending) return this.schedule();
    const events = this.events.splice(0);
    const summaries = this.summaryDirty ? this.snapshot() : null;
    const clearSummary = this.clearSummary;
    if (!events.length && !summaries && !clearSummary) return;
    this.summaryDirty = false;
    this.clearSummary = false;
    this.sending = true;
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: this.secret, events, summaries, clearSummary }),
        redirect: "follow", // Apps Script 웹 앱은 한 번 다른 주소로 넘겨서 답한다
      });
      const text = await res.text();
      if (!res.ok || !text.includes('"ok":true')) throw new Error(`응답 ${res.status}: ${text.slice(0, 120)}`);
      this.failures = 0;
    } catch (e) {
      // 못 보낸 기록은 앞에 다시 넣고 점점 간격을 늘려 다시 보낸다.
      this.events.unshift(...events);
      if (this.events.length > MAX_QUEUE) this.events.splice(0, this.events.length - MAX_QUEUE);
      this.summaryDirty ||= summaries !== null;
      this.clearSummary ||= clearSummary;
      this.failures++;
      console.warn(`구글 시트로 기록을 보내지 못했어요 (${this.failures}번째): ${e.message}`);
      if (this.failures < MAX_FAILURES) this.schedule(Math.min(60000, 2000 * this.failures));
    } finally {
      this.sending = false;
    }
  }
}
