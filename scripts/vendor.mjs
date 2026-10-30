// node_modules의 three.js와 MathJax에서 브라우저가 쓰는 파일만 public/vendor로 복사한다.
// 버전을 올린 뒤 `npm run vendor`를 다시 실행한다.
import { cpSync, mkdirSync, rmSync } from "node:fs";

const packages = {
  three: [
    ["build/three.module.min.js", "three.module.min.js"],
    ["build/three.core.min.js", "three.core.min.js"],
    ["examples/jsm/loaders/GLTFLoader.js", "addons/loaders/GLTFLoader.js"],
    ["examples/jsm/utils/BufferGeometryUtils.js", "addons/utils/BufferGeometryUtils.js"],
    ["examples/jsm/utils/SkeletonUtils.js", "addons/utils/SkeletonUtils.js"],
    ["LICENSE", "LICENSE"],
  ],
  mathjax: [
    ["es5/tex-chtml.js", "tex-chtml.js"],
    ["es5/output/chtml/fonts/woff-v2", "output/chtml/fonts/woff-v2"],
    ["LICENSE", "LICENSE"],
  ],
};

for (const [name, files] of Object.entries(packages)) {
  const out = `public/vendor/${name}`;
  rmSync(out, { recursive: true, force: true });
  for (const [from, to] of files) {
    mkdirSync(`${out}/${to}`.replace(/\/[^/]+$/, ""), { recursive: true });
    cpSync(`node_modules/${name}/${from}`, `${out}/${to}`, { recursive: true });
  }
  console.log(`${name} 파일 ${files.length}묶음을 ${out}에 복사했어요.`);
}
