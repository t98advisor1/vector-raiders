// 문제 문장 표기법 → MathJax
//   $...$  → TeX 수식 그대로 (매크로 \vv{a}: 벡터 a, \VV{AB}: 벡터 AB)
//   [AB]   → 벡터 AB (짧게 쓰는 표기, 수식 밖에서)
//   {a}    → 벡터 a
//   ^2     → 위첨자
// fmt()는 MathJax가 읽을 \( \) 수식이 든 HTML을 돌려주고, 화면에 붙으면 watchMath()가 조판한다.
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ESC[c]);

// ---------- 글 속 수식 자동 변환 ----------
// 문항 파일에 $…$를 쓰지 않아도, 글 속의 수식 부분(영문자·숫자와 수학 기호가 이어진 덩어리)을 찾아 MathJax 수식으로 바꾼다.
//   |[AB]| → |\VV{AB}|,  √5 → \sqrt{5},  x² → x^{2},  a₁ → a_{1},  60° → 60^{\circ},  · → \cdot,  θ → \theta …
// 숫자만 있는 덩어리(예: "상자 6")는 글자 그대로 둔다.
const MATH_CHARS = "A-Za-z0-9\\[\\]{}()|+\\-−–×·⋅/=,.:'′²³₀₁₂₃√πθ°∥⊥⟺⇔≠≤≥±∠ ";
const RUN = new RegExp(`[${MATH_CHARS}]+`, "g");
const SIGNAL = /[A-Za-z√πθ°²³₀₁₂₃∥⊥⟺⇔≠≤≥±·×|=+\-−:/∠]/;
const SUB = { "₀": "0", "₁": "1", "₂": "2", "₃": "3" };
const SYM = { "−": "-", "–": "-", "×": "\\times ", "·": "\\cdot ", "⋅": "\\cdot ", "∥": "\\parallel ", "⊥": "\\perp ", "⟺": "\\iff ", "⇔": "\\iff ",
  "≠": "\\neq ", "≤": "\\le ", "≥": "\\ge ", "±": "\\pm ", "∠": "\\angle ", "π": "\\pi ", "θ": "\\theta ", "°": "^{\\circ}", "²": "^{2}", "³": "^{3}", "′": "'" };

function toTex(run) {
  let t = run
    .replace(/\[([A-Z]{1,3})\]/g, "\\VV{$1}")
    .replace(/\{([a-z])([₀₁₂₃0-9]?)\}/g, (_, v, d) => `\\vv{${v}${d ? `_{${SUB[d] ?? d}}` : ""}}`)
    .replace(/\b(cos|sin)\b/g, "\\$1 ")
    .replace(/([₀₁₂₃])/g, (c) => `_{${SUB[c]}}`)
    .replace(/\^(\d)/g, "^{$1}");
  // √(…) → \sqrt{…}, √5 → \sqrt{5}, √x → \sqrt{x}
  t = t.replace(/√\s*\(([^()]*(\([^()]*\)[^()]*)*)\)/g, "\\sqrt{$1}").replace(/√\s*([0-9.]+|[A-Za-z])/g, "\\sqrt{$1}");
  // 입체 이름 ABCD-EFGH의 '-'는 빼기가 아니라 붙임표
  t = t.replace(/([A-Z]{2,})-([A-Z]{2,})/g, "$1‐$2");
  // 점 이름(대문자)은 똑바로 선 글씨로: A, ABCD-EFGH, P(1, 2)
  t = t.replace(/(\\[A-Za-z]+\{[^}]*\}|\\[A-Za-z]+)|([A-Z]+)/g, (m, cmd, up) => (cmd ? cmd : `\\mathrm{${up}}`));
  for (const [k, v] of Object.entries(SYM)) t = t.split(k).join(v);
  t = t.split("‐").join("\\text{-}");
  return t;
}

function autoMath(text) {
  return text.replace(RUN, (run, off, all) => {
    if (!SIGNAL.test(run)) return run;
    // 앞뒤 빈칸·문장부호, 짝이 없는 괄호는 수식 밖으로
    let lead = run.match(/^[\s,.:]*/)[0], body = run.slice(lead.length), tail = "";
    const trail = /[\s,.:]+$/.exec(body);
    if (trail) { tail = trail[0]; body = body.slice(0, -tail.length); }
    while (body.startsWith("(") && (body.match(/\(/g) ?? []).length > (body.match(/\)/g) ?? []).length) { lead += "("; body = body.slice(1); }
    while (body.endsWith(")") && (body.match(/\)/g) ?? []).length > (body.match(/\(/g) ?? []).length) { tail = ")" + tail; body = body.slice(0, -1); }
    if (!body || !SIGNAL.test(body)) return run;
    // 'Ⅲ-1', '3-2'처럼 글자에 바로 붙은 하이픈 번호는 수식이 아니다
    if (!lead && /^[-–]\d+$/.test(body) && off > 0 && /[^\s(=+,]/.test(all[off - 1])) return run;
    if (/^[:\-−/|=+]$/.test(body.trim())) return run; // 기호 하나만 덩그러니 있으면 글자로
    return `${lead}\\(${toTex(body)}\\)${tail}`;
  });
}

export function fmt(src) {
  return String(src)
    .split(/\$([^$]+)\$/)
    .map((part, i) => {
      if (i % 2 === 1) return `\\(${esc(part)}\\)`;
      return esc(autoMath(part)); // 수식 덩어리에는 < > & 가 들어가지 않는다
    })
    .join("");
}

// 같은 표기법을 SVG 라벨용 조각으로 나눈다: [{text, vec, upright}]
// 문제 그림(끌 수 있는 판) 안의 라벨은 그림과 함께 움직여야 해서 MathJax 대신 직접 그린다.
export function parts(src) {
  const out = [];
  const re = /\{([a-z])\}|\[([A-Z]{1,3})\]|([^{[]+)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) out.push({ text: m[1], vec: true, upright: false });
    else if (m[2]) out.push({ text: m[2], vec: true, upright: true });
    else out.push({ text: m[3], vec: false, upright: !/^[a-z]+$/.test(m[3]) });
  }
  return out;
}

// 화면에 \( \) 수식이 새로 붙으면 다음 프레임에 한꺼번에 조판한다.
const pending = new Set();
let scheduled = false;

function flush() {
  scheduled = false;
  const MJ = window.MathJax;
  if (!MJ?.typesetPromise) { // 아직 MathJax를 불러오는 중이면 조금 뒤에 다시
    scheduled = true;
    setTimeout(flush, 150);
    return;
  }
  const live = [...pending].filter((e) => e.isConnected);
  pending.clear();
  // 바깥 상자와 안쪽 상자를 함께 넘기면 같은 수식이 두 번 찍힌다. 가장 바깥 것만 넘긴다.
  const els = live.filter((e) => !live.some((o) => o !== e && o.contains(e)));
  if (els.length) MJ.typesetPromise(els).catch(() => {});
}

export function watchMath(root = document.body) {
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        const el = n.nodeType === 1 ? n : n.parentElement;
        if (el && !el.closest("mjx-container") && el.textContent.includes("\\(")) pending.add(el);
      }
    }
    if (pending.size && !scheduled) { scheduled = true; requestAnimationFrame(flush); }
  }).observe(root, { childList: true, subtree: true });
}

// 합답형 문항: 본문과 [보기] 상자를 나눈다. "…고른 것은?\n\n[보기]\nㄱ. …\nㄴ. …" → { stem, lines: ["ㄱ. …", …] }
export function splitBogi(src) {
  const s = String(src ?? "");
  const i = s.indexOf("[보기]");
  if (i < 0) return { stem: s, lines: [] };
  const lines = s.slice(i + 4).split("\n").map((l) => l.trim()).filter(Boolean);
  return { stem: s.slice(0, i).trim(), lines };
}

// [보기]를 줄마다 나눈 상자로 그린 HTML (ㄱ, ㄴ, ㄷ 한 줄씩)
export function bogiHtml(lines) {
  if (!lines?.length) return "";
  return `<div class="bogi-box"><div class="bogi-title">보기</div>${lines.map((l) => `<div class="bogi-line">${fmt(l)}</div>`).join("")}</div>`;
}

// 본문 + 보기 상자 (인쇄용). 본문의 줄바꿈도 살린다.
export function boxedText(src) {
  const { stem, lines } = splitBogi(src);
  return fmt(stem).replace(/\n/g, "<br>") + bogiHtml(lines);
}
