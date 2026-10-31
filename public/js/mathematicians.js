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

export function mathematicianCard(m) {
  return `
    <div class="math-card">
      <div class="math-card-badge">🌟 기하를 빛낸 수학자 카드 해금!</div>
      <div class="math-card-head">
        <div class="math-card-avatar">${m.badge.split(" ")[0]}</div>
        <div>
          <h2 class="math-card-name">${m.name}</h2>
          <div class="math-card-title">${m.title} <span class="math-card-era">(${m.era})</span></div>
        </div>
      </div>
      <blockquote class="math-card-quote">${m.quote}</blockquote>
      <div class="math-card-story">
        <b>💡 기하학 속 이야기</b>
        <p>${m.story}</p>
      </div>
      <div class="math-card-bonus">
        <span>🎁 수학자 탐구 보너스 마일리지</span>
        <b>+${m.bonus}점</b>
      </div>
    </div>`;
}
