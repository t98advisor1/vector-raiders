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
export function makeCharacter(gltf, { outline = true } = {}) {
  const model = SkeletonUtils.clone(gltf.scene);
  const meshes = [];
  let headBone = null;
  model.traverse((o) => {
    if (o.name === "head") headBone = o;
    if (o.isMesh) {
      meshes.push(o);
      o.material = o.material.clone();
      o.material.roughness = 0.18;
      o.material.metalness = 0.05;
    }
  });

  // 카트라이더 스타일: 동글동글한 헬멧과 귀여운 동물 귀, 핑크빛 볼터치 장착
  if (headBone) {
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.14,
      metalness: 0.1,
    });
    // 1. 동글동글 헬멧 돔
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 20), helmetMat);
    helmet.scale.set(1.18, 1.15, 1.18);
    helmet.position.set(0, 0.14, 0.02);
    helmet.castShadow = true;
    headBone.add(helmet);

    // 2. 동글동글 레이싱 고글/바이저
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.7 });
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.12, 24, 1, false, -Math.PI / 3, (Math.PI * 2) / 3), visorMat);
    visor.position.set(0, 0.13, 0.06);
    headBone.add(visor);

    // 3. 귀여운 동글동글 동물 귀 (곰/고양이 귀)
    const earMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 });
    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), earMat);
    earL.position.set(-0.24, 0.38, 0);
    const earR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), earMat);
    earR.position.set(0.24, 0.38, 0);
    headBone.add(earL, earR);

    // 4. 귀여운 핑크빛 볼터치
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.75 });
    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), cheekMat);
    cheekL.scale.set(1, 0.6, 0.2);
    cheekL.position.set(-0.2, -0.02, 0.29);
    const cheekR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), cheekMat);
    cheekR.scale.set(1, 0.6, 0.2);
    cheekR.position.set(0.2, -0.02, 0.29);
    headBone.add(cheekL, cheekR);
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
