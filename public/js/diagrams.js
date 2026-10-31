// 교사용 해설집 및 문제 카드에 삽입되는 7개 유물 문제의 정적 SVG 기하 도해
// A4 2단 인쇄 및 화면 해설 보기에서 벡터의 기하학적 형상을 선명하게 제공한다.

export const DIAGRAMS = {
  p1: `
    <svg class="tp-svg" viewBox="0 0 160 140" width="160" height="140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="ah-p1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#dc2626" />
        </marker>
        <marker id="ah-p1-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#2563eb" />
        </marker>
      </defs>
      <!-- 정육각형 ABCDEF (중심 80, 70, 반지름 50) -->
      <polygon points="55,26.7 105,26.7 130,70 105,113.3 55,113.3 30,70" fill="#f8fafc" stroke="#334155" stroke-width="2" />
      <!-- 대각선 AD, BE, CF -->
      <line x1="55" y1="26.7" x2="105" y2="113.3" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3,3" />
      <line x1="30" y1="70" x2="130" y2="70" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3,3" />
      <line x1="105" y1="26.7" x2="55" y2="113.3" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3,3" />
      <!-- 벡터 BC 강조 (B(30,70) -> C(55,113.3)) -->
      <line x1="30" y1="70" x2="53" y2="109.8" stroke="#dc2626" stroke-width="3.5" marker-end="url(#ah-p1)" />
      <!-- 꼭짓점 점 및 레이블 -->
      <circle cx="80" cy="70" r="3" fill="#1e293b" />
      <text x="83" y="66" font-size="11" font-weight="700" fill="#1e293b">O</text>
      <text x="50" y="20" font-size="11" font-weight="700" fill="#1e293b">A</text>
      <text x="110" y="20" font-size="11" font-weight="700" fill="#1e293b">F</text>
      <text x="135" y="74" font-size="11" font-weight="700" fill="#1e293b">E</text>
      <text x="108" y="127" font-size="11" font-weight="700" fill="#1e293b">D</text>
      <text x="47" y="127" font-size="11" font-weight="700" fill="#dc2626">C</text>
      <text x="16" y="74" font-size="11" font-weight="700" fill="#dc2626">B</text>
    </svg>`,

  p2: `
    <svg class="tp-svg" viewBox="0 0 160 140" width="160" height="140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="ah-p2-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#2563eb" />
        </marker>
        <marker id="ah-p2-orange" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#ea580c" />
        </marker>
        <marker id="ah-p2-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#16a34a" />
        </marker>
      </defs>
      <!-- 정사각형 ABCD (좌표 A(30,25), B(30,105), C(110,105), D(110,25)) -->
      <polygon points="30,25 110,25 110,105 30,105" fill="#f8fafc" stroke="#334155" stroke-width="2" />
      <!-- 중점 M(30,65), N(70,25) -->
      <!-- 벡터 MN (M -> N, 파란색) -->
      <line x1="30" y1="65" x2="67" y2="28" stroke="#2563eb" stroke-width="3" marker-end="url(#ah-p2-blue)" />
      <!-- 벡터 MB (M -> B, 주황색) -->
      <line x1="30" y1="65" x2="30" y2="101" stroke="#ea580c" stroke-width="3" marker-end="url(#ah-p2-orange)" />
      <!-- 보조선 BN (B -> N, 초록 점선: MN - MB = BN) -->
      <line x1="30" y1="105" x2="68" y2="29" stroke="#16a34a" stroke-width="2.5" stroke-dasharray="4,3" marker-end="url(#ah-p2-green)" />
      <!-- 점 및 레이블 -->
      <circle cx="30" cy="65" r="3.5" fill="#2563eb" />
      <circle cx="70" cy="25" r="3.5" fill="#2563eb" />
      <text x="18" y="23" font-size="11" font-weight="700" fill="#1e293b">A</text>
      <text x="18" y="115" font-size="11" font-weight="700" fill="#1e293b">B</text>
      <text x="115" y="115" font-size="11" font-weight="700" fill="#1e293b">C</text>
      <text x="115" y="23" font-size="11" font-weight="700" fill="#1e293b">D</text>
      <text x="12" y="68" font-size="11" font-weight="700" fill="#2563eb">M</text>
      <text x="68" y="16" font-size="11" font-weight="700" fill="#2563eb">N</text>
    </svg>`,

  p3: `
    <svg class="tp-svg" viewBox="0 0 160 140" width="160" height="140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="ah-p3-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#2563eb" />
        </marker>
        <marker id="ah-p3-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#16a34a" />
        </marker>
      </defs>
      <!-- 부채꼴 OAB (중심 O(35,115), 반지름 R=80, 90도 부채꼴) -->
      <path d="M 35 115 L 115 115 A 80 80 0 0 0 35 35 Z" fill="#f8fafc" stroke="#334155" stroke-width="1.8" />
      <!-- 벡터 OA(a), OB(b) -->
      <line x1="35" y1="115" x2="111" y2="115" stroke="#2563eb" stroke-width="2.5" marker-end="url(#ah-p3-blue)" />
      <line x1="35" y1="115" x2="35" y2="39" stroke="#ea580c" stroke-width="2.5" marker-end="url(#ah-p3-blue)" />
      <!-- 점 C: 각도 30도 (35+80*cos(30)=104.3, 115-80*sin(30)=75) -->
      <line x1="35" y1="115" x2="101" y2="77" stroke="#16a34a" stroke-width="3" marker-end="url(#ah-p3-green)" />
      <!-- C에서 수선의 발 -->
      <line x1="104.3" y1="75" x2="104.3" y2="115" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" />
      <line x1="104.3" y1="75" x2="35" y2="75" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" />
      <!-- 30도 각도 호 -->
      <path d="M 55 115 A 20 20 0 0 0 52.3 105" fill="none" stroke="#64748b" stroke-width="1.2" />
      <text x="56" y="108" font-size="9" fill="#64748b">30°</text>
      <!-- 점 및 레이블 -->
      <text x="23" y="125" font-size="11" font-weight="700" fill="#1e293b">O</text>
      <text x="118" y="125" font-size="11" font-weight="700" fill="#1e293b">A</text>
      <text x="23" y="32" font-size="11" font-weight="700" fill="#1e293b">B</text>
      <circle cx="104.3" cy="75" r="3.5" fill="#16a34a" />
      <text x="110" y="74" font-size="11" font-weight="700" fill="#16a34a">C</text>
    </svg>`,

  p4: `
    <svg class="tp-svg" viewBox="0 0 160 140" width="160" height="140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="ah-p4-purple" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#7c3aed" />
        </marker>
        <marker id="ah-p4-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#dc2626" />
        </marker>
      </defs>
      <!-- 격자 배경 -->
      <g stroke="#f1f5f9" stroke-width="1">
        <line x1="20" y1="20" x2="140" y2="20" /><line x1="20" y1="50" x2="140" y2="50" />
        <line x1="20" y1="80" x2="140" y2="80" /><line x1="20" y1="110" x2="140" y2="110" />
        <line x1="30" y1="10" x2="30" y2="130" /><line x1="70" y1="10" x2="70" y2="130" />
        <line x1="110" y1="10" x2="110" y2="130" />
      </g>
      <!-- 평행 기준선 (기울기 -2) -->
      <line x1="50" y1="130" x2="110" y2="10" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4" />
      <!-- 벡터 p+q (보라색, (80,70) -> (95,40)) -->
      <line x1="80" y1="70" x2="93" y2="44" stroke="#7c3aed" stroke-width="3" marker-end="url(#ah-p4-purple)" />
      <!-- 평행 벡터 q-r (빨간색, (80,70) -> (65,100)) -->
      <line x1="80" y1="70" x2="67" y2="96" stroke="#dc2626" stroke-width="3" marker-end="url(#ah-p4-red)" />
      <circle cx="80" cy="70" r="3" fill="#1e293b" />
      <text x="96" y="42" font-size="10" font-weight="700" fill="#7c3aed">p+q</text>
      <text x="40" y="105" font-size="10" font-weight="700" fill="#dc2626">q−r</text>
      <text x="70" y="65" font-size="9" fill="#64748b">O</text>
      <text x="88" y="125" font-size="9" font-style="italic" fill="#64748b">두 벡터가 평행</text>
    </svg>`,

  p5: `
    <svg class="tp-svg" viewBox="0 0 160 140" width="160" height="140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="ah-p5" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#2563eb" />
        </marker>
        <marker id="ah-p5-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#16a34a" />
        </marker>
      </defs>
      <!-- 시점 O(25, 115) -->
      <!-- 일직선 (A(65, 75), B(95, 45), C(130, 10)) -->
      <line x1="50" y1="90" x2="145" y2="-5" stroke="#94a3b8" stroke-width="1.8" stroke-dasharray="4,3" />
      <!-- 벡터 OA, OB, OC -->
      <line x1="25" y1="115" x2="62" y2="78" stroke="#2563eb" stroke-width="2.2" marker-end="url(#ah-p5)" />
      <line x1="25" y1="115" x2="92" y2="48" stroke="#ea580c" stroke-width="2.2" marker-end="url(#ah-p5)" />
      <line x1="25" y1="115" x2="126" y2="14" stroke="#16a34a" stroke-width="2.5" marker-end="url(#ah-p5-green)" />
      <!-- 점 및 레이블 -->
      <circle cx="25" cy="115" r="3" fill="#1e293b" />
      <text x="14" y="125" font-size="11" font-weight="700" fill="#1e293b">O</text>
      <circle cx="65" cy="75" r="3.5" fill="#2563eb" />
      <text x="69" y="86" font-size="11" font-weight="700" fill="#2563eb">A(a)</text>
      <circle cx="95" cy="45" r="3.5" fill="#ea580c" />
      <text x="99" y="56" font-size="11" font-weight="700" fill="#ea580c">B(b)</text>
      <circle cx="130" cy="10" r="3.5" fill="#16a34a" />
      <text x="135" y="18" font-size="11" font-weight="700" fill="#16a34a">C</text>
      <text x="80" y="130" font-size="9" font-style="italic" fill="#64748b">A, B, C가 한 직선 위</text>
    </svg>`,

  p6: `
    <svg class="tp-svg" viewBox="0 0 160 140" width="160" height="140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="ah-p6-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#dc2626" />
        </marker>
        <marker id="ah-p6-diag" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#2563eb" />
        </marker>
      </defs>
      <!-- 직육면체 ABCD-EFGH 등각 투영도 -->
      <!-- 윗면 ABCD: A(35,45), B(95,30), C(135,50), D(75,65) -->
      <!-- 아랫면 EFGH: E(35,95), F(95,80), G(135,100), H(75,115) -->
      <!-- 보이지 않는 모서리 점선 -->
      <line x1="35" y1="45" x2="35" y2="95" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="3,3" />
      <line x1="35" y1="45" x2="95" y2="30" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="3,3" />
      <line x1="35" y1="95" x2="75" y2="115" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="3,3" />
      <!-- 보이는 모서리 실선 -->
      <polygon points="95,30 135,50 75,65" fill="none" stroke="#334155" stroke-width="1.8" />
      <line x1="95" y1="30" x2="95" y2="80" stroke="#334155" stroke-width="1.8" />
      <line x1="135" y1="50" x2="135" y2="100" stroke="#334155" stroke-width="1.8" />
      <line x1="75" y1="65" x2="75" y2="115" stroke="#334155" stroke-width="1.8" />
      <polyline points="95,80 135,100 75,115" fill="none" stroke="#334155" stroke-width="1.8" />
      <!-- 대각선 AG (A(35,45) -> G(135,100)) 파란 화살표 -->
      <line x1="35" y1="45" x2="131" y2="98" stroke="#2563eb" stroke-width="2" stroke-dasharray="3,2" marker-end="url(#ah-p6-diag)" />
      <!-- 수직 모서리 GC 강조 (G(135,100) -> C(135,54)) 빨간 화살표 -->
      <line x1="135" y1="100" x2="135" y2="54" stroke="#dc2626" stroke-width="3" marker-end="url(#ah-p6-red)" />
      <!-- 레이블 -->
      <text x="24" y="44" font-size="10" font-weight="700" fill="#1e293b">A</text>
      <text x="96" y="24" font-size="10" font-weight="700" fill="#1e293b">B</text>
      <text x="140" y="48" font-size="10" font-weight="700" fill="#dc2626">C</text>
      <text x="63" y="66" font-size="10" font-weight="700" fill="#1e293b">D</text>
      <text x="24" y="102" font-size="10" font-weight="700" fill="#1e293b">E</text>
      <text x="96" y="93" font-size="10" font-weight="700" fill="#1e293b">F</text>
      <text x="140" y="105" font-size="10" font-weight="700" fill="#dc2626">G</text>
      <text x="73" y="128" font-size="10" font-weight="700" fill="#1e293b">H</text>
    </svg>`,

  p7: `
    <svg class="tp-svg" viewBox="0 0 160 140" width="160" height="140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="ah-p7-axis" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L5,2.5 z" fill="#64748b" />
        </marker>
        <marker id="ah-p7-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#16a34a" />
        </marker>
      </defs>
      <!-- 좌표축 x, y (원점 O(30, 115)) -->
      <line x1="20" y1="115" x2="145" y2="115" stroke="#64748b" stroke-width="1.2" marker-end="url(#ah-p7-axis)" />
      <line x1="30" y1="125" x2="30" y2="15" stroke="#64748b" stroke-width="1.2" marker-end="url(#ah-p7-axis)" />
      <text x="142" y="127" font-size="10" font-style="italic" fill="#64748b">x</text>
      <text x="18" y="20" font-size="10" font-style="italic" fill="#64748b">y</text>
      <text x="18" y="127" font-size="10" font-weight="700" fill="#1e293b">O</text>
      <!-- 원: 중심 (2,2) -> (80,65), 반지름 r=2 -> 50px -->
      <!-- 원이 x축, y축에 접함 -->
      <circle cx="80" cy="65" r="50" fill="#f8fafc" stroke="#2563eb" stroke-width="2" />
      <circle cx="80" cy="65" r="2.5" fill="#2563eb" />
      <text x="83" y="62" font-size="9" fill="#2563eb">(2,2)</text>
      <!-- 단위원 위 Q의 자취 호 (중심 O(30,115), 반지름 24, 각도 0~90도) -->
      <path d="M 54 115 A 24 24 0 0 0 30 91" fill="none" stroke="#16a34a" stroke-width="3.5" />
      <!-- 원점에서의 접선 2개 (x축, y축) -->
      <!-- 동경 OP 및 OQ -->
      <line x1="30" y1="115" x2="108" y2="35" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3,3" />
      <line x1="30" y1="115" x2="47" y2="98" stroke="#16a34a" stroke-width="2.8" marker-end="url(#ah-p7-green)" />
      <circle cx="108" cy="35" r="3.5" fill="#dc2626" />
      <text x="113" y="38" font-size="10" font-weight="700" fill="#dc2626">P</text>
      <circle cx="47" cy="98" r="3" fill="#16a34a" />
      <text x="51" y="96" font-size="10" font-weight="700" fill="#16a34a">Q</text>
      <text x="56" y="132" font-size="9" font-weight="700" fill="#16a34a">호의 길이 = π</text>
    </svg>`,
};
