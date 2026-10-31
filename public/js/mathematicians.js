// 기하를 빛낸 위대한 수학자 히든 카드 컬렉션
// 사격 및 탐험 중 이벤트로 해금되어 학생들에게 깊이 있는 수학사 배경지식과 보너스 마일리지 점수(+80점)를 제공한다.

export const MATHEMATICIANS = [
  {
    id: "descartes",
    name: "르네 데카르트 (René Descartes)",
    era: "1596 ~ 1650 (프랑스)",
    title: "좌표평면의 창시자 & 해석기하학의 아버지",
    quote: "“나는 생각한다, 고로 나는 존재한다. (Cogito, ergo sum)”",
    badge: "📐 좌표기하학",
    story: "천장에 붙어 날아다니는 파리의 위치를 나타내기 위해 가로와 세로의 직교 축 (x, y)을 고안했어요! 복잡한 도형을 대수 수식으로 나타내는 '좌표계'의 탄생으로 오늘날 3D 게임과 컴퓨터 그래픽의 기틀이 마련되었습니다.",
    bonus: 80,
  },
  {
    id: "fermat",
    name: "피에르 드 페르마 (Pierre de Fermat)",
    era: "1607 ~ 1665 (프랑스)",
    title: "해석기하학의 선구자 & 페르마의 원리",
    quote: "“나는 경이로운 증명을 발견했으나 여백이 부족하여 적지 않는다.”",
    badge: "✨ 극값과 광학",
    story: "데카르트와 동시에 독자적으로 좌표 기하학을 정립하고, 곡선의 접선과 극대·극소를 구하는 방법을 고안했습니다. '빛은 이동 시간이 가장 짧은 경로를 따라 진행한다'는 '페르마의 원리'는 현대 기하 광학의 핵심 원리입니다.",
    bonus: 80,
  },
  {
    id: "euler",
    name: "레온하르트 오일러 (Leonhard Euler)",
    era: "1707 ~ 1783 (스위스)",
    title: "위상수학과 벡터 표기법의 거장",
    quote: "“오일러의 공식을 읽어라, 그는 우리 모두의 스승이다.”",
    badge: "🏛️ 다면체 정리",
    story: "다면체의 꼭짓점(V), 모서리(E), 면(F) 사이에 항상 V - E + F = 2가 성립한다는 '오일러의 다면체 정리'를 발견했습니다. 또한 3차원 공간에서 벡터를 성분(x, y, z)으로 체계화하여 현대 물리학과 기하학을 완성했습니다.",
    bonus: 80,
  },
  {
    id: "gauss",
    name: "카를 프리드리히 가우스 (Carl Friedrich Gauss)",
    era: "1777 ~ 1855 (독일)",
    title: "수학의 왕 & 미분기하학의 개척자",
    quote: "“수학은 과학의 여왕이고, 정수론은 수학의 여왕이다.”",
    badge: "👑 복소평면과 곡률",
    story: "복소수를 2차원 평면의 벡터처럼 나타내는 '복소평면(가우스 평면)'을 완성했습니다. 또한 휘어진 곡면의 안쪽에서 성질을 측정하는 '가우스 곡률'을 창안하여 아인슈타인의 일반 상대성 이론으로 이어지는 현대 기하학의 문을 열었습니다.",
    bonus: 80,
  },
  {
    id: "euclid",
    name: "유클리드 (Euclid of Alexandria)",
    era: "기원전 300년경 (고대 그리스)",
    title: "기하학의 시조 & 《기하학 원론》의 저자",
    quote: "“기하학에는 왕도가 없습니다. (There is no royal road to geometry)”",
    badge: "📜 공리적 연역",
    story: "5가지 기본 공리와 공준으로부터 수백 개의 기하학적 정리를 빈틈없이 증명한 불후의 명저 《기하학 원론(Elements)》을 저술했습니다. 인류 역사상 성경 다음으로 많이 인쇄된 책으로, 2천 년 동안 논리적 사고와 기하 교육의 표준이 되었습니다.",
    bonus: 80,
  },
];

// 수학자 초상 일러스트 (SVG로 직접 그림). 널리 알려진 초상화의 특징을 살렸다.
//   데카르트: 어깨까지 오는 검은 머리·콧수염·흰 칼라 / 페르마: 긴 곱슬 가발·콧수염 / 오일러: 천 모자·갈색 옷
//   가우스: 검은 벨벳 모자·흰 머리·흰 목도리 / 유클리드: 흰 수염·월계관·토가
const LOOK = {
  descartes: { bg: ["#1e3a8a", "#312e81"], skin: "#f1c9a5", hair: "#1c1917", hairStyle: "long", mustache: "#1c1917", coat: "#111827", collar: "#f8fafc" },
  fermat: { bg: ["#7c2d12", "#581c87"], skin: "#f3cfae", hair: "#3f2a1d", hairStyle: "curly", mustache: "#3f2a1d", coat: "#1f2937", collar: "#e5e7eb" },
  euler: { bg: ["#0e7490", "#1e3a8a"], skin: "#efc7a0", hair: "#e5e7eb", hairStyle: "short", hat: { color: "#78350f", kind: "cloth" }, coat: "#7c2d12", collar: "#f8fafc" },
  gauss: { bg: ["#065f46", "#1e3a8a"], skin: "#efc4a1", hair: "#f1f5f9", hairStyle: "short", hat: { color: "#111827", kind: "velvet" }, coat: "#1f2937", collar: "#f8fafc" },
  euclid: { bg: ["#92400e", "#7c2d12"], skin: "#e8b88f", hair: "#f8fafc", hairStyle: "bald", beard: "#f8fafc", laurel: true, coat: "#f5f0e1", collar: "#d6c7a1" },
};

export function portraitSvg(m) {
  const L = LOOK[m.id] ?? LOOK.euclid;
  const id = `pg-${m.id}`;
  const hair = {
    long: `<path d="M38 52 Q34 30 60 24 Q86 30 82 52 L86 92 Q74 84 74 64 L46 64 Q46 84 34 92 Z" fill="${L.hair}"/>`,
    curly: `${[[36, 50], [34, 64], [36, 78], [38, 92], [84, 50], [86, 64], [84, 78], [82, 92], [44, 34], [60, 28], [76, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${L.hair}"/>`).join("")}`,
    short: `<path d="M40 50 Q40 30 60 28 Q80 30 80 50 Q76 40 60 40 Q44 40 40 50 Z" fill="${L.hair}"/><circle cx="40" cy="58" r="6" fill="${L.hair}"/><circle cx="80" cy="58" r="6" fill="${L.hair}"/>`,
    bald: `<circle cx="41" cy="56" r="6" fill="${L.hair}"/><circle cx="79" cy="56" r="6" fill="${L.hair}"/>`,
  }[L.hairStyle];
  const hat = !L.hat ? "" : L.hat.kind === "velvet"
    ? `<path d="M38 44 Q38 22 60 22 Q82 22 82 44 Q60 36 38 44 Z" fill="${L.hat.color}"/><ellipse cx="60" cy="44" rx="23" ry="4" fill="#000" opacity="0.35"/>`
    : `<path d="M36 46 Q40 20 60 20 Q82 20 84 46 Q60 38 36 46 Z" fill="${L.hat.color}"/><path d="M40 40 Q60 34 80 40" stroke="#facc15" stroke-width="2" fill="none"/>`;
  const laurel = L.laurel ? [...Array(7)].map((_, k) => { const a = Math.PI * (1.05 + k * 0.14); return `<ellipse cx="${60 + 23 * Math.cos(a)}" cy="${46 + 14 * Math.sin(a)}" rx="5" ry="2.6" fill="#65a30d" transform="rotate(${(a * 180) / Math.PI + 90} ${60 + 23 * Math.cos(a)} ${46 + 14 * Math.sin(a)})"/>`; }).join("") : "";
  const beard = L.beard ? `<path d="M44 66 Q46 100 60 104 Q74 100 76 66 Q70 78 60 78 Q50 78 44 66 Z" fill="${L.beard}"/>` : "";
  const mustache = L.mustache ? `<path d="M50 73 Q55 69 60 72 Q65 69 70 73 Q64 72 60 75 Q56 72 50 73 Z" fill="${L.mustache}"/>` : "";
  return `
    <svg class="math-portrait" viewBox="0 0 120 130" role="img" aria-label="${m.name.split(" (")[0]} 초상 일러스트">
      <defs>
        <radialGradient id="${id}" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="${L.bg[0]}"/><stop offset="1" stop-color="${L.bg[1]}"/></radialGradient>
      </defs>
      <rect x="2" y="2" width="116" height="126" rx="18" fill="url(#${id})"/>
      <g opacity="0.18" stroke="#fff" stroke-width="0.8">${[20, 40, 60, 80, 100].map((v) => `<line x1="${v}" y1="6" x2="${v}" y2="124"/><line x1="6" y1="${v + 5}" x2="114" y2="${v + 5}"/>`).join("")}</g>
      ${L.hairStyle === "long" || L.hairStyle === "curly" ? hair : ""}
      <path d="M22 130 Q24 98 60 94 Q96 98 98 130 Z" fill="${L.coat}"/>
      <path d="M44 96 Q60 108 76 96 L72 110 Q60 116 48 110 Z" fill="${L.collar}"/>
      <rect x="53" y="80" width="14" height="16" rx="5" fill="${L.skin}"/>
      <ellipse cx="60" cy="60" rx="20" ry="23" fill="${L.skin}"/>
      ${L.hairStyle === "short" || L.hairStyle === "bald" ? hair : ""}
      ${hat}${laurel}
      <ellipse cx="52" cy="60" rx="2.6" ry="3" fill="#1f2937"/><ellipse cx="68" cy="60" rx="2.6" ry="3" fill="#1f2937"/>
      <path d="M48 53 Q52 51 56 53 M64 53 Q68 51 72 53" stroke="#57534e" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M60 62 Q57 68 60 70" stroke="#b07a5a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <circle cx="46" cy="69" r="4" fill="#f87171" opacity="0.25"/><circle cx="74" cy="69" r="4" fill="#f87171" opacity="0.25"/>
      ${beard}${mustache}
      <path d="M54 77 Q60 80 66 77" stroke="#9a3412" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="${L.beard ? 0 : 1}"/>
      <rect x="2" y="2" width="116" height="126" rx="18" fill="none" stroke="#fcd34d" stroke-width="3"/>
    </svg>`;
}

// 이름 글자를 한 자씩 떨어뜨리는 모션용
const letters = (t) => [...t].map((c, i) => `<span class="ch" style="--i:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");

export function mathematicianCard(m) {
  const [ko, en] = m.name.split(" (");
  return `
    <div class="math-card">
      <div class="math-card-badge">🌟 기하를 빛낸 수학자 카드 해금!</div>
      <div class="math-card-head">
        <div class="math-card-portrait">${portraitSvg(m)}<span class="math-card-icon">${m.badge.split(" ")[0]}</span></div>
        <div>
          <h2 class="math-card-name" aria-label="${ko}">${letters(ko)}</h2>
          ${en ? `<div class="math-card-en">${en.replace(")", "")}</div>` : ""}
          <div class="math-card-title">${m.title}</div>
          <div class="math-card-era">${m.era}</div>
        </div>
      </div>
      <blockquote class="math-card-quote">${m.quote}</blockquote>
      <div class="math-card-story">
        <b>💡 기하학 속 이야기</b>
        <p class="math-story-text"></p>
      </div>
      <div class="math-card-bonus">
        <span>🎁 수학자 탐구 보너스 마일리지</span>
        <b>+${m.bonus}점</b>
      </div>
    </div>`;
}
