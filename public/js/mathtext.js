// 문제 문장 표기법 → MathJax
//   $...$  → TeX 수식 그대로 (매크로 \vv{a}: 벡터 a, \VV{AB}: 벡터 AB)
//   [AB]   → 벡터 AB (짧게 쓰는 표기, 수식 밖에서)
//   {a}    → 벡터 a
//   ^2     → 위첨자
// fmt()는 MathJax가 읽을 \( \) 수식이 든 HTML을 돌려주고, 화면에 붙으면 watchMath()가 조판한다.
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ESC[c]);

export function fmt(src) {
  return String(src)
    .split(/\$([^$]+)\$/)
    .map((part, i) => {
      if (i % 2 === 1) return `\\(${esc(part)}\\)`;
      return esc(part)
        .replace(/\[([A-Z]{1,3})\]/g, "\\(\\VV{$1}\\)")
        .replace(/\{([a-z])\}/g, "\\(\\vv{$1}\\)")
        .replace(/\^(\d)/g, "<sup>$1</sup>");
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
