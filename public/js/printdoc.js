// 인쇄 미리보기: 누르는 순간 새 창(탭)을 열어 인쇄용 페이지를 보여 준다.
// 아이패드·아이폰 Safari는 누른 순간이 아닌 때의 인쇄를 막고, 인쇄 창이 뜨기 전에 화면이 바뀌면 빈 종이가 나온다.
// 그래서 내용을 따로 띄운 페이지에서 수식을 그린 뒤 '인쇄 / PDF로 저장' 버튼을 누르게 한다(컴퓨터는 자동으로 인쇄 창도 연다).
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function openPrintDoc(title, bodyHtml) {
  const w = window.open("", "_blank");
  if (!w) return false; // 팝업이 막혔으면 부른 쪽이 예전 방식으로 인쇄한다
  const safeTitle = String(title).replace(/[<>&"]/g, "");
  w.document.open();
  w.document.write(`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap">
<link rel="stylesheet" href="${location.origin}/css/print.css">
<script>
  window.MathJax = {
    tex: { inlineMath: [["\\\\(", "\\\\)"]], macros: { vv: ["\\\\overrightarrow{#1}", 1], VV: ["\\\\overrightarrow{\\\\mathrm{#1}}", 1] } },
    chtml: { fontURL: "${location.origin}/vendor/mathjax/output/chtml/fonts/woff-v2" },
    startup: { pageReady: () => MathJax.startup.defaultPageReady().then(() => window.__ready && window.__ready()) },
  };
</script>
<script defer src="${location.origin}/vendor/mathjax/tex-chtml.js"></script>
</head><body class="print-doc">
<div class="print-bar">
  <button class="go" type="button" onclick="window.print()">🖨️ 인쇄 / PDF로 저장</button>
  <button class="close" type="button" onclick="window.close()">닫기</button>
  <small>인쇄 창에서 '대상(프린터)'을 'PDF로 저장'으로 고르면 파일로 받아요. 아이패드는 공유 ▸ 프린트에서 두 손가락으로 벌리면 PDF가 돼요.</small>
</div>
<main class="print-page" data-wait="1">${bodyHtml}</main>
<script>
  window.__ready = () => {
    document.querySelector(".print-page").removeAttribute("data-wait");
    ${IOS ? "" : "setTimeout(() => { try { window.print(); } catch (e) {} }, 300);"}
  };
</script>
</body></html>`);
  w.document.close();
  return true;
}
