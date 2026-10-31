// 문항 그림 엔진의 계산 부분 (화면과 상관없음 — 서버의 업로드 검사와 테스트도 쓴다)
//
// 문항 파일의 '그림:' 한 줄을 읽어 장면을 만든다. 예)
//   그림: 평면 a=3,-4 b=-1,3 끌기=a 보기=|a|;a·b;각(a,b)
//   그림: 공간 직육면체=3,4,12 보기=ㄱ:|AC|;ㄴ:|AG|;ㄷ:|EG|-(|AG|-|AE|)
//   그림: 평면 A=1,3 B=3,7 P=A+t*AB 슬라이더=t,-1,3,0.5 직선=A,AB 보기=P
//
// 이름 규칙
//   소문자 한 글자(+숫자): 벡터나 조절기 값   a, b, u, n1, t
//   대문자: 점(원점에서의 위치벡터)            A, B, P1
//   대문자 두 글자 AB: 정의되지 않았으면 벡터 B − A
// 식: + − * / · ( ) |v|(크기) √x 각(u,v) 각선(u,v)(두 직선이 이루는 예각) mid(A,B) div(A,B,m,n) cen(A,B,C)
//     2a처럼 수 다음에 이름을 붙여 쓰면 곱셈
// 설정(키=값, 값 안에는 띄어쓰기 없이 ; 로 여러 개)
//   범위=xmin,xmax,ymin,ymax (평면) / 범위=r (공간)
//   끌기=a,A   슬라이더=t,-3,3,0.5;k,0,2,0.1   보기=라벨:식;식   화살표=a,b,AB   선분=AB,BC
//   다각형=ABCD   직선=A,u   원=C,r   (공간) 평면=n,d (n·x + d = 0)   구=C,r   직육면체=가로,세로,높이   자취=P

const RESERVED = new Set(["범위", "끌기", "슬라이더", "보기", "화살표", "선분", "다각형", "직선", "원", "평면", "구", "직육면체", "자취", "숨김"]);

// ---------- 식 계산 ----------
function tokenize(src) {
  const out = [];
  const s = String(src).replace(/−/g, "-").replace(/×/g, "*").replace(/⋅/g, "·");
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    let m;
    if ((m = /^\d+(\.\d+)?/.exec(s.slice(i)))) { out.push({ t: "num", v: Number(m[0]) }); i += m[0].length; continue; }
    if ((m = /^각선|^각/.exec(s.slice(i)))) { out.push({ t: "fn", v: m[0] }); i += m[0].length; continue; }
    if ((m = /^(mid|div|cen|cos|sin)(?=\()/.exec(s.slice(i)))) { out.push({ t: "fn", v: m[1] }); i += m[1].length; continue; }
    if ((m = /^[A-Z]+[0-9]*'?/.exec(s.slice(i)))) { out.push({ t: "up", v: m[0] }); i += m[0].length; continue; }
    if ((m = /^[a-z][0-9]*/.exec(s.slice(i)))) { out.push({ t: "lo", v: m[0] }); i += m[0].length; continue; }
    if ("+-*/·(),|√".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`읽을 수 없는 글자 '${c}'`);
  }
  return out;
}

const isVec = (x) => Array.isArray(x);
const vadd = (a, b, k = 1) => a.map((x, i) => x + k * (b[i] ?? 0));
const vmul = (k, a) => a.map((x) => k * x);
const vdot = (a, b) => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
const vlen = (a) => Math.sqrt(vdot(a, a));

export function evalExpr(src, env) {
  const tk = tokenize(src);
  let p = 0;
  const peek = () => tk[p];
  const eat = (v) => { if (tk[p]?.v === v) { p++; return true; } return false; };
  const need = (v) => { if (!eat(v)) throw new Error(`'${v}'가 필요해요`); };
  const startsFactor = (t) => t && (t.t === "num" || t.t === "lo" || t.t === "up" || t.t === "fn" || t.v === "(" || t.v === "√" || (t.v === "|" && !inAbs));
  let inAbs = 0;

  const add = (a, b, sign) => {
    if (isVec(a) !== isVec(b)) throw new Error("수와 벡터는 더할 수 없어요");
    return isVec(a) ? vadd(a, b, sign) : a + sign * b;
  };
  const mul = (a, b) => {
    if (isVec(a) && isVec(b)) throw new Error("벡터끼리는 · 로 내적을 써요");
    if (isVec(a)) return vmul(b, a);
    if (isVec(b)) return vmul(a, b);
    return a * b;
  };
  function expr() {
    let v = term();
    for (;;) {
      if (eat("+")) v = add(v, term(), 1);
      else if (eat("-")) v = add(v, term(), -1);
      else return v;
    }
  }
  function term() {
    let v = unary();
    for (;;) {
      if (eat("*")) v = mul(v, unary());
      else if (eat("/")) { const d = unary(); if (isVec(d)) throw new Error("벡터로 나눌 수 없어요"); v = isVec(v) ? vmul(1 / d, v) : v / d; }
      else if (eat("·")) { const w = unary(); if (!isVec(v) || !isVec(w)) throw new Error("· 는 두 벡터 사이에 써요"); v = vdot(v, w); }
      else if (startsFactor(peek())) v = mul(v, unary());
      else return v;
    }
  }
  function unary() {
    if (eat("-")) { const v = unary(); return isVec(v) ? vmul(-1, v) : -v; }
    if (eat("+")) return unary();
    return factor();
  }
  function lookup(name) {
    if (name in env) return env[name];
    if (/^[A-Z]{2}$/.test(name) && name[0] in env && name[1] in env) return vadd(env[name[1]], env[name[0]], -1);
    throw new Error(`'${name}'이(가) 무엇인지 몰라요`);
  }
  function factor() {
    const t = tk[p++];
    if (!t) throw new Error("식이 끝났어요");
    if (t.t === "num") return t.v;
    if (t.t === "lo" || t.t === "up") return lookup(t.v);
    if (t.v === "(") {
      // (x, y) 또는 (x, y, z)는 성분으로 쓴 벡터
      const first = expr();
      if (eat(",")) { const v = [first, expr()]; if (eat(",")) v.push(expr()); need(")"); return v; }
      need(")");
      return first;
    }
    if (t.v === "|") { inAbs++; const v = expr(); inAbs--; need("|"); return isVec(v) ? vlen(v) : Math.abs(v); }
    if (t.v === "√") { const v = factor(); if (isVec(v)) throw new Error("√ 안에는 수를 써요"); return Math.sqrt(v); }
    if (t.t === "fn") {
      need("(");
      const args = [expr()];
      while (eat(",")) args.push(expr());
      need(")");
      if (t.v === "각" || t.v === "각선") {
        const [u, w] = args;
        let deg = (Math.acos(Math.max(-1, Math.min(1, vdot(u, w) / (vlen(u) * vlen(w))))) * 180) / Math.PI;
        if (t.v === "각선" && deg > 90) deg = 180 - deg;
        return deg;
      }
      if (t.v === "cos") return Math.cos((args[0] * Math.PI) / 180); // 각은 도 단위
      if (t.v === "sin") return Math.sin((args[0] * Math.PI) / 180);
      if (t.v === "mid") return vmul(0.5, vadd(args[0], args[1]));
      if (t.v === "cen") return vmul(1 / 3, vadd(vadd(args[0], args[1]), args[2]));
      if (t.v === "div") { const [A, B, m, n] = args; return vmul(1 / (m + n), vadd(vmul(n, A), vmul(m, B))); }
    }
    throw new Error(`'${t.v}'를 읽을 수 없어요`);
  }
  const v = expr();
  if (p < tk.length) throw new Error(`'${tk[p].v}' 근처를 읽을 수 없어요`);
  return v;
}

// "1/3", "-2", "√2" 같은 조절기 값
function numberOf(x) { const v = evalExpr(String(x), {}); if (Array.isArray(v)) throw new Error("조절기 값은 수로 써요"); return v; }

// 정의 값: 괄호 없이 쓴 성분(예: 4,k 또는 0,-√3)도 벡터로 읽는다
function evalLoose(expr, env) {
  try { return evalExpr(expr, env); } catch (e) {
    if (expr.includes(",")) return evalExpr(`(${expr})`, env);
    throw e;
  }
}

// ---------- '그림:' 줄 읽기 ----------
export function parseFigure(spec) {
  const parts = String(spec ?? "").trim().split(/\s+/).filter(Boolean);
  const kind = parts[0] === "평면" ? "2d" : parts[0] === "공간" ? "3d" : null;
  if (!kind) return null;
  const fig = { kind, defs: [], starts: {}, sliders: [], drag: [], show: [], arrows: null, segs: [], polys: [], lines: [], circles: [], planes: [], spheres: [], box: null, trail: [], hide: [], range: null };
  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    if (eq < 1) throw new Error(`'${part}'는 '이름=값'으로 써 주세요`);
    const key = part.slice(0, eq), val = part.slice(eq + 1);
    const list = (sep = ",") => val.split(sep).map((x) => x.trim()).filter(Boolean);
    if (key === "범위") fig.range = list().map(Number);
    else if (key === "끌기") fig.drag = list();
    else if (key === "슬라이더") fig.sliders = list(";").map((s) => { const [name, min, max, step] = s.split(","); return { name, min: numberOf(min), max: numberOf(max), step: numberOf(step ?? "0.1"), value: numberOf(min) }; });
    else if (key === "보기") fig.show = list(";").map((s) => { const m = /^([^:]{1,12}):(.+)$/.exec(s); return m ? { label: m[1], expr: m[2] } : { label: "", expr: s }; });
    else if (key === "화살표") fig.arrows = list();
    else if (key === "선분") fig.segs = list();
    else if (key === "다각형") fig.polys = list();
    else if (key === "직선") fig.lines = list(";").map((s) => s.split(","));
    else if (key === "원") fig.circles = list(";").map((s) => s.split(","));
    else if (key === "평면") fig.planes = list(";").map((s) => s.split(","));
    else if (key === "구") fig.spheres = list(";").map((s) => s.split(","));
    else if (key === "직육면체") fig.box = list().map(Number);
    else if (key === "자취") fig.trail = list();
    else if (key === "숨김") fig.hide = list();
    else if (/^[A-Za-z][A-Za-z0-9]*$/.test(key) && !RESERVED.has(key)) {
      const [expr, start] = val.split("@");
      fig.defs.push([key, expr]);
      if (start) fig.starts[key] = start;
    } else throw new Error(`'${key}'는 모르는 설정이에요`);
  }
  // 조절기 처음 값: 0이 범위 안이면 0 근처, 아니면 최솟값
  for (const s of fig.sliders) s.value = s.min <= 0 && s.max >= 0 ? 0 : s.min;
  return fig;
}

// 장면 계산: 직육면체 꼭짓점 → 조절기 → 정의(위에서 아래로) 순서로 env를 채운다
export function evalScene(fig, state = {}) {
  const env = {};
  if (fig.box) {
    const [w, d, h] = fig.box;
    Object.assign(env, {
      A: [0, 0, h], B: [w, 0, h], C: [w, d, h], D: [0, d, h],
      E: [0, 0, 0], F: [w, 0, 0], G: [w, d, 0], H: [0, d, 0],
    });
  }
  for (const s of fig.sliders) env[s.name] = state[s.name] ?? s.value;
  for (const [name, expr] of fig.defs) {
    if (state[name] !== undefined && isVec(state[name])) { env[name] = state[name]; continue; } // 끌어서 바꾼 값
    env[name] = /^-?[\d.]+(,-?[\d.]+){1,2}$/.test(expr) ? expr.split(",").map(Number) : evalLoose(expr, env);
  }
  return env;
}

// 그림 줄이 올바른지 검사 (업로드 검사·테스트용): 오류 글자 또는 null
export function checkFigure(spec) {
  try {
    const fig = parseFigure(spec);
    if (!fig) return null;
    const env = evalScene(fig);
    for (const s of fig.show) evalLoose(s.expr, env);
    for (const a of fig.arrows ?? []) evalExpr(a, env);
    for (const [P, u] of fig.lines) { evalExpr(P, env); evalExpr(u, env); }
    for (const [n, d] of fig.planes) { evalExpr(n, env); evalExpr(d, env); }
    for (const [c, r] of [...fig.spheres, ...fig.circles]) { evalExpr(c, env); evalExpr(r, env); }
    for (const name of fig.drag) if (!(name in env)) throw new Error(`끌기 '${name}'가 정의되지 않았어요`);
    return null;
  } catch (e) {
    return e.message;
  }
}

// 값을 읽기 좋게: 정수, √n, 분수, 소수 둘째 자리
export function niceNumber(v) {
  if (!Number.isFinite(v)) return "–";
  const r = Math.round(v);
  if (Math.abs(v - r) < 1e-6) return String(r);
  const sq = v * v, rs = Math.round(sq);
  if (Math.abs(sq - rs) < 1e-6 && rs < 1000) {
    // a√b 꼴로
    let a = 1, b = rs;
    for (let k = Math.floor(Math.sqrt(rs)); k > 1; k--) if (rs % (k * k) === 0) { a = k; b = rs / (k * k); break; }
    return `${v < 0 ? "−" : ""}${a > 1 ? a : ""}√${b}`;
  }
  for (let d = 2; d <= 12; d++) { const n = Math.round(v * d); if (Math.abs(v - n / d) < 1e-6) return `${n < 0 ? "−" : ""}${Math.abs(n)}/${d}`; }
  return v.toFixed(2);
}

export function niceValue(v) {
  return isVec(v) ? `(${v.map(niceNumber).join(", ")})` : niceNumber(v);
}
