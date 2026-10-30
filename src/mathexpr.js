// 학생이 입력한 답(예: "2√5", "π/2", "-3/2", "m=1")을 안전하게 수로 계산한다.
// eval을 쓰지 않고 작은 재귀 하강 파서로 처리한다.

const MAX_INPUT = 40;

export function normalizeInput(raw) {
  if (typeof raw !== "string") return null;
  let s = raw.trim();
  if (s.length === 0 || s.length > MAX_INPUT) return null;
  s = s
    .replace(/[−–—]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, "")
    .replace(/sqrt/gi, "√")
    .replace(/pi/gi, "π");
  // "m=1", "k = -2" 처럼 변수 이름을 붙여 쓴 답을 허용한다.
  s = s.replace(/^[a-z]=/i, "");
  return s.length ? s : null;
}

function tokenize(s) {
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const text = s.slice(i, j);
      if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return null;
      tokens.push({ t: "num", v: Number(text) });
      i = j;
    } else if ("+-*/^()√π".includes(c)) {
      tokens.push({ t: c });
      i++;
    } else {
      return null;
    }
  }
  return tokens;
}

export function evaluate(raw) {
  const s = normalizeInput(raw);
  if (s === null) return null;
  const tokens = tokenize(s);
  if (!tokens) return null;
  let pos = 0;
  const peek = () => tokens[pos];
  const startsAtom = (tok) => tok && (tok.t === "num" || tok.t === "π" || tok.t === "√" || tok.t === "(");

  function expr() {
    let v = term();
    while (peek() && (peek().t === "+" || peek().t === "-")) {
      const op = tokens[pos++].t;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function term() {
    let v = unary();
    for (;;) {
      const tok = peek();
      if (tok && (tok.t === "*" || tok.t === "/")) {
        pos++;
        const r = unary();
        v = tok.t === "*" ? v * r : v / r;
      } else if (startsAtom(tok)) {
        v = v * power(); // 2√5, 3π 같은 생략된 곱셈
      } else {
        return v;
      }
    }
  }
  function unary() {
    const tok = peek();
    if (tok && (tok.t === "-" || tok.t === "+")) {
      pos++;
      const v = unary();
      return tok.t === "-" ? -v : v;
    }
    return power();
  }
  function power() {
    const base = atom();
    if (peek() && peek().t === "^") {
      pos++;
      return Math.pow(base, unary());
    }
    return base;
  }
  function atom() {
    const tok = tokens[pos++];
    if (!tok) throw new Error("end");
    if (tok.t === "num") return tok.v;
    if (tok.t === "π") return Math.PI;
    if (tok.t === "√") return Math.sqrt(atom());
    if (tok.t === "(") {
      const v = expr();
      if (!peek() || peek().t !== ")") throw new Error("paren");
      pos++;
      return v;
    }
    throw new Error("unexpected");
  }

  try {
    const v = expr();
    if (pos !== tokens.length || !Number.isFinite(v)) return null;
    return v;
  } catch {
    return null;
  }
}
