// 반 전체 협동 현황: 실험실 에너지와 유물 진열장. 학생·교사 화면이 함께 쓴다.
import { PROBLEMS } from "./problems.js";

export function renderClassBar(root, cls, { showEnergy, showShelf }) {
  root.replaceChildren();
  if (!cls) return;

  if (showEnergy) {
    const pct = Math.round(cls.energy * 100);
    const energy = document.createElement("div");
    energy.className = "energy";
    energy.innerHTML = `<span>✨ 우리 반 벡터 점프</span><div class="bar"><i style="width:${pct}%"></i></div><b>${pct}%</b>`;
    root.appendChild(energy);
  }

  if (showShelf) {
    const unlocked = PROBLEMS.filter((p) => cls.relics[p.id]?.unlocked).length;
    const need = cls.relics[PROBLEMS[0]?.id]?.need ?? 1;
    const title = document.createElement("div");
    title.className = "shelf-title";
    title.textContent = `우리 반 유물 ${unlocked}/${PROBLEMS.length} · 한 문제를 ${need}명이 풀면 그 유물이 깨어나요`;
    const shelf = document.createElement("div");
    shelf.className = "shelf";
    PROBLEMS.forEach((p, i) => {
      const r = cls.relics[p.id] ?? { solved: 0, need, unlocked: false };
      const item = document.createElement("div");
      item.className = `relic${r.unlocked ? " on" : ""}`;
      const pct = Math.min(100, Math.round((r.solved / r.need) * 100));
      item.innerHTML = `<span class="ri">${p.icon}</span><span class="rn">${i + 1}. ${p.relic}</span>
        <span class="rbar"><i style="width:${pct}%"></i></span><span class="rc">${r.solved}/${r.need}</span>`;
      shelf.appendChild(item);
    });
    root.append(title, shelf);
  }
}
