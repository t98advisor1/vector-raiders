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
    o.material.roughness = 0.5;
    o.material.metalness = 0;
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
  model.traverse((o) => { if (o.isMesh) meshes.push(o); });
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
