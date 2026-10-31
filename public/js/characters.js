// 탐험가 캐릭터 (Kenney Mini Characters, CC0)를 불러와 매끈하게 다듬는다.
// 게임 화면(world3d.js)과 첫 화면(intro.js)이 같은 캐릭터를 쓴다.
//   - 각진 면을 부드러운 음영으로: 꼭짓점을 합쳐 법선을 다시 계산
//   - 만화처럼 또렷하게: 바깥으로 살짝 부풀린 뒷면으로 윤곽선
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

export const CHARS = ["male-a", "female-a", "male-b", "female-b", "male-c", "female-c", "male-d", "female-d", "male-e", "female-e", "male-f", "female-f"]
  .map((s) => `/models/chars/character-${s}.glb`);

const loader = new GLTFLoader();
const cache = new Map();

// n번째 캐릭터(색)를 한 번만 받아 다듬어 둔다.
export function loadCharacter(n) {
  const url = CHARS[n % CHARS.length];
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url).then(smooth));
  return cache.get(url);
}

function smooth(gltf) {
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.deleteAttribute("normal");
    o.geometry = mergeVertices(g, 1e-4);
    o.geometry.computeVertexNormals();
    o.material = o.material.clone();
    o.material.roughness = 0.18; // 카트라이더 스타일: 매끈매끈한 광택
    o.material.metalness = 0.05;
  });
  return gltf;
}

const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1b1530, side: THREE.BackSide });
OUTLINE.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normal * 0.02;");
};

// 장면에 놓을 캐릭터 하나: { model, mixer, action(name) }
export function makeCharacter(gltf, { outline = true, n = 0 } = {}) {
  const model = SkeletonUtils.clone(gltf.scene);
  const meshes = [];
  let headBone = null;
  model.traverse((o) => {
    if (o.name === "head") headBone = o;
    if (o.isMesh) {
      meshes.push(o);
      o.material = o.material.clone();
      o.material.roughness = 0.16;
      o.material.metalness = 0.05;
    }
  });

  // 5대 기하 수학자별 고유 캐릭터 외형 (데카르트, 페르마, 오일러, 가우스, 유클리드)
  if (headBone) {
    const mType = Math.abs(Number(n) || 0) % 5;
    // 핑크빛 볼터치는 공통 장착
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.75 });
    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), cheekMat);
    cheekL.scale.set(1, 0.6, 0.2);
    cheekL.position.set(-0.2, -0.02, 0.29);
    const cheekR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), cheekMat);
    cheekR.scale.set(1, 0.6, 0.2);
    cheekR.position.set(0.2, -0.02, 0.29);
    headBone.add(cheekL, cheekR);

    if (mType === 0) {
      // 0. 데카르트 (Descartes): 웨이브 흑발, 프렌치 콧수염 & 화이트 레이스 칼라
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.2 });
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 16), hairMat);
      hair.scale.set(1.15, 1.1, 1.15);
      hair.position.set(0, 0.14, 0.01);
      headBone.add(hair);
      const stacheMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const stacheL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.12, 8), stacheMat);
      stacheL.rotation.z = Math.PI / 3;
      stacheL.position.set(-0.06, -0.07, 0.31);
      const stacheR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.12, 8), stacheMat);
      stacheR.rotation.z = -Math.PI / 3;
      stacheR.position.set(0.06, -0.07, 0.31);
      headBone.add(stacheL, stacheR);
      const collarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 12, 24), collarMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, -0.18, 0.05);
      headBone.add(collar);
    } else if (mType === 1) {
      // 1. 페르마 (Fermat): 플럼 학사 베레모와 둥근 금테 안경
      const beretMat = new THREE.MeshStandardMaterial({ color: 0x4a044e, roughness: 0.25 });
      const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.14, 24), beretMat);
      beret.position.set(0, 0.32, 0);
      beret.rotation.z = 0.1;
      const beretTop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
      beretTop.position.set(0, 0.4, 0);
      headBone.add(beret, beretTop);
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.1, metalness: 0.8 });
      const gL = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 16), glassMat);
      gL.position.set(-0.11, 0.08, 0.31);
      const gR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 16), glassMat);
      gR.position.set(0.11, 0.08, 0.31);
      const gBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), glassMat);
      gBridge.rotation.z = Math.PI / 2;
      gBridge.position.set(0, 0.08, 0.31);
      headBone.add(gL, gR, gBridge);
    } else if (mType === 2) {
      // 2. 오일러 (Euler): 실크 터번 캡과 골드 모노클
      const turbanMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 });
      const turban = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), turbanMat);
      turban.scale.set(1.18, 1.15, 1.2);
      turban.position.set(0, 0.16, 0.02);
      const brim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.06, 12, 24), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
      brim.rotation.x = Math.PI / 2;
      brim.position.set(0, 0.12, 0.02);
      headBone.add(turban, brim);
      const monocleMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.1, metalness: 0.85 });
      const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.016, 8, 16), monocleMat);
      monocle.position.set(0.11, 0.08, 0.32);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.15, 6), monocleMat);
      chain.position.set(0.18, 0.02, 0.3);
      headBone.add(monocle, chain);
    } else if (mType === 3) {
      // 3. 가우스 (Gauss): 벨벳 학사모와 화이트 깃펜
      const capMat = new THREE.MeshStandardMaterial({ color: 0x164e63, roughness: 0.2 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.16, 20), capMat);
      cap.position.set(0, 0.32, 0);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 8, 20), new THREE.MeshStandardMaterial({ color: 0xfde68a, metalness: 0.6 }));
      band.rotation.x = Math.PI / 2;
      band.position.set(0, 0.24, 0);
      headBone.add(cap, band);
      const quillMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const quill = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 8), quillMat);
      quill.rotation.z = -0.4;
      quill.position.set(-0.25, 0.38, 0);
      headBone.add(quill);
    } else {
      // 4. 유클리드 (Euclid): 황금 월계관과 고대 현자의 턱수염
      const wreathMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.15, metalness: 0.85 });
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 12, 24), wreathMat);
      wreath.rotation.x = Math.PI / 2 + 0.15;
      wreath.position.set(0, 0.2, 0.02);
      for (let i = 0; i < 8; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), wreathMat);
        leaf.scale.set(0.5, 1.8, 0.3);
        const ang = (i / 8) * Math.PI * 2;
        leaf.position.set(Math.cos(ang) * 0.34, 0.2, Math.sin(ang) * 0.34);
        leaf.rotation.y = -ang;
        headBone.add(leaf);
      }
      headBone.add(wreath);
      const beardMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
      const beard = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), beardMat);
      beard.scale.set(1.1, 1.4, 0.9);
      beard.position.set(0, -0.16, 0.24);
      headBone.add(beard);
    }
  }

  for (const m of meshes) {
    m.castShadow = true;
    if (!outline) continue;
    const line = m.clone();
    line.material = OUTLINE;
    line.castShadow = false;
    m.parent.add(line);
  }
  const mixer = new THREE.AnimationMixer(model);
  const action = (name) => mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, name));
  return { model, mixer, action };
}
