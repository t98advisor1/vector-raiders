// 문항 세트 파일(md)을 읽어 상자·문항·핵심 카드 데이터로 바꾼다.
// 형식은 content/sets/geo-3-1.md 맨 위 설명을 따른다. 서버와 테스트가 같이 쓴다.
const LEVEL = { 하: "low", 중: "mid", 상: "high" };
const POINTS = { low: 70, mid: 100, high: 150 };
const KIND = { 숫자: "num", 오지선다: "choice", 고르기: "set", 벡터식: "vec" };

export function parseSet(md) {
  const text = String(md).replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
  const meta = {};
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (fm) for (const line of fm[1].split("\n")) { const m = line.match(/^([^:]+):\s*(.*)$/); if (m) meta[m[1].trim()] = m[2].trim(); }
  const body = fm ? text.slice(fm[0].length) : text;
  const boxes = [], cards = [], errors = [];
  let box = null, level = null, card = null;
  const field = (line) => line.match(/^-?\s*([^:：]+?)\s*[:：]\s*(.*)$/);
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line || line === "---") continue;
    let m;
    if ((m = line.match(/^#\s*상자\s*(\d+)\s*[·•-]?\s*(.*)$/))) {
      box = { no: Number(m[1]), title: m[2].trim(), room: 1, coop: false, tool: "", concept: "", levels: {} };
      boxes.push(box); level = null; card = null; continue;
    }
    if ((m = line.match(/^#\s*핵심\s*카드\s*[·•-]?\s*(.*)$/))) {
      card = { title: m[1].trim(), tablet: cards.length + 1, summary: "", points: [] };
      cards.push(card); box = null; level = null; continue;
    }
    if (box && (m = line.match(/^##\s*(하|중|상)/))) {
      const key = LEVEL[m[1]];
      level = box.levels[key] = { level: key, points: POINTS[key], text: "", conditions: [], kind: "", options: [], answer: "", hint: "" };
      continue;
    }
    if (card) {
      if ((m = line.match(/^-\s*비석\s*[:：]\s*(\d+)/))) card.tablet = Number(m[1]);
      else if ((m = line.match(/^요약\s*[:：]\s*(.*)$/))) card.summary = m[1];
      else if (line.startsWith("- ")) card.points.push(line.slice(2).trim());
      continue;
    }
    if (box && !level && (m = field(line))) {
      const [k, v] = [m[1].replace(/^-\s*/, ""), m[2]];
      if (k === "방") box.room = Number(v);
      else if (k === "협업") box.coop = /^(예|네|yes|o)/i.test(v);
      else if (k === "그림") box.tool = v === "없음" ? "" : v;
      else if (k === "개념") box.concept = v;
      continue;
    }
    if (level && (m = field(line))) {
      const [k, v] = [m[1], m[2].replace(/\\n/g, "\n")];
      if (k === "문제") level.text = v;
      else if (/^조건/.test(k)) level.conditions.push({ label: k.replace(/^조건\s*/, ""), text: v });
      else if (k === "답 형식") level.kind = KIND[v] ?? "";
      else if (k === "보기") level.options = v.split(level.kind === "choice" ? "|" : ",").map((s) => s.trim()).filter(Boolean);
      else if (k === "정답") level.answer = v;
      else if (k === "풀이") level.hint = v;
      else if (k === "점수") level.points = Number(v) || level.points;
    }
  }
  // 검사: 상자 번호, 난이도 3단계, 필수 칸
  boxes.forEach((b, i) => {
    if (b.no !== i + 1) errors.push(`상자 번호가 ${i + 1}이어야 하는데 ${b.no}예요.`);
    for (const key of ["low", "mid", "high"]) {
      const lv = b.levels[key];
      const where = `상자 ${b.no} ${{ low: "하", mid: "중", high: "상" }[key]}`;
      if (!lv) { errors.push(`${where}: 문항이 없어요.`); continue; }
      if (!lv.text) errors.push(`${where}: 문제가 없어요.`);
      if (!lv.kind) errors.push(`${where}: 답 형식(숫자/오지선다/고르기/벡터식)이 없어요.`);
      if (!lv.answer) errors.push(`${where}: 정답이 없어요.`);
      if ((lv.kind === "choice" || lv.kind === "set") && !lv.options.length) errors.push(`${where}: 보기가 없어요.`);
      if (b.coop && key === "high" && lv.conditions.length < 2) errors.push(`${where}: 협업 상자는 조건 ㉠·㉡이 필요해요.`);
    }
  });
  return { meta, boxes, cards, errors };
}

// 벡터식 정답 "−a+2b", "3/2a+b" → { a: -1, b: 2 }
export function parseVecExpr(src) {
  const s = String(src ?? "").replace(/[−–]/g, "-").replace(/\s|\{|\}|→|⃗/g, "").replace(/vec|\\vv/gi, "");
  if (!s || !/^[-+0-9./a-z()]+$/i.test(s) || s.length > 40) return null;
  const out = {};
  const re = /([+-]?)((?:\d+(?:\.\d+)?)(?:\/\d+(?:\.\d+)?)?)?([a-z])/gy;
  let m, pos = 0;
  while (pos < s.length) {
    re.lastIndex = pos;
    m = re.exec(s);
    if (!m) return null;
    let k = 1;
    if (m[2]) { const [p, q] = m[2].split("/"); k = Number(p) / (q ? Number(q) : 1); }
    if (m[1] === "-") k = -k;
    out[m[3]] = (out[m[3]] ?? 0) + k;
    pos = re.lastIndex;
  }
  return out;
}

// ---------- 올린 세트 검사 (전체 관리자 업로드용) ----------
// 형식 오류에 더해, 정답을 그 정답 그대로 채점했을 때 맞게 나오는지까지 확인한다.
// grade는 answers.js의 gradeLevel (순환 import를 피하려고 인자로 받는다).
export const SET_ID_RE = /^[a-z0-9][a-z0-9-]{2,29}$/;
const strip = (s) => String(s ?? "").replace(/[<>"'`]/g, "").trim();

export function validateSet(md, grade) {
  if (typeof md !== "string" || !md.trim()) return { ok: false, errors: ["파일이 비어 있어요."] };
  if (md.length > 200_000) return { ok: false, errors: ["파일이 너무 커요 (200KB 이하)."] };
  const set = parseSet(md);
  const errors = [...set.errors];
  const id = String(set.meta.세트 ?? "").trim().toLowerCase();
  if (!SET_ID_RE.test(id)) errors.push("맨 위 '세트:' 이름은 영어 소문자·숫자·하이픈 3~30자로 써 주세요. 예: 세트: phys-1-2");
  if (!set.meta.제목) errors.push("맨 위에 '제목:'을 적어 주세요.");
  if (set.boxes.length !== 9) errors.push(`상자는 9개여야 해요 (지금 ${set.boxes.length}개).`);
  for (const b of set.boxes) {
    if (!b.room || b.room < 1 || b.room > 4) errors.push(`상자 ${b.no}: 방은 1~4로 적어 주세요.`);
    for (const [k, lv] of Object.entries(b.levels)) {
      const name = { low: "하", mid: "중", high: "상" }[k];
      if (!lv.kind || !lv.answer) continue; // 위에서 이미 알렸다
      const input = lv.kind === "set" ? lv.answer.split(",").map((x) => x.trim()) : lv.kind === "choice" ? (lv.answer.match(/\d/)?.[0] ?? lv.answer) : lv.answer;
      if (grade && grade(lv, input)?.ok !== true) errors.push(`상자 ${b.no} ${name}: 정답 '${lv.answer}'을(를) 채점기가 읽지 못해요. 숫자는 2√5, 1/2, π/2처럼, 벡터식은 -a+2b처럼 써 주세요.`);
      if (lv.kind === "choice" && lv.options.length !== 5) errors.push(`상자 ${b.no} ${name}: 오지선다는 보기가 5개여야 해요.`);
    }
  }
  if (!set.cards.length) errors.push("핵심 카드가 하나도 없어요. '# 핵심 카드 · 제목'으로 적어 주세요.");
  // 제목·개념·그림 칸은 화면에 그대로 들어가므로 HTML 글자를 지운다 (본문·풀이는 화면에서 따로 막는다)
  for (const b of set.boxes) { b.title = strip(b.title); b.concept = strip(b.concept); b.tool = strip(b.tool); }
  for (const c of set.cards) c.title = strip(c.title);
  for (const k of Object.keys(set.meta)) set.meta[k] = strip(set.meta[k]);
  return {
    ok: errors.length === 0, errors: errors.slice(0, 30), id, set,
    summary: { title: set.meta.제목 ?? "", boxes: set.boxes.length, items: set.boxes.length * 3, cards: set.cards.length, coop: set.boxes.filter((b) => b.coop).length },
  };
}
