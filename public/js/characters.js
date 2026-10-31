// 레이더(탐험가) 캐릭터 (Kenney Mini Characters, CC0)를 불러와 다듬는다.
// 게임 화면(world3d.js)과 첫 화면(intro.js)이 같은 캐릭터를 쓴다.
//   - 원래 모델의 얼굴·모자·옷을 그대로 살린다 (얼굴을 덮는 장식은 달지 않는다)
//   - 머리 크기(폭 약 0.45)에 맞춘 작은 레이더 장비: 배낭, 팀 색 스카프, 벡터 블래스터
//   - 5대 수학자(데카르트·페르마·오일러·가우스·유클리드)는 배낭 색과 배낭 위 문장(紋章)으로 구별한다
//   - 만화처럼 또렷하게: 바깥으로 살짝 부풀린 뒷면으로 윤곽선
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

export const CHARS = ["male-a", "female-a", "male-b", "female-b", "male-c", "female-c", "male-d", "female-d", "male-e", "female-e", "male-f", "female-f"]
  .map((s) => `/models/chars/character-${s}.glb`);

// 팀 색 (A 레드, B 블루, C 그린, D 퍼플) — 학생 화면 TEAMS 색과 같게. 미니맵·이름표·바닥 링도 같은 색을 쓴다.
export const TEAM_COLORS = { A: 0xff4d5e, B: 0x3d8bff, C: 0x22d39a, D: 0xb15cff };
export const teamColor = (team, n = 0) =>
  TEAM_COLORS[team] ?? Object.values(TEAM_COLORS)[Math.abs(Number(n) || 0) % 4];

// 5대 수학자: 배낭 색, 문장 색, 문장 모양
const MATHEMATICIANS = [
  { name: "데카르트", pack: 0x3b3355, emblem: 0x7dd3fc, shape: "axes" }, // 좌표축
  { name: "페르마", pack: 0x5b2a6e, emblem: 0xfbbf24, shape: "ring" }, // 금빛 고리
  { name: "오일러", pack: 0x1f4f7a, emblem: 0x34d399, shape: "gem" }, // 에메랄드
  { name: "가우스", pack: 0x1d5c55, emblem: 0xfde68a, shape: "star" }, // 별
  { name: "유클리드", pack: 0x6b4a2b, emblem: 0xf8fafc, shape: "tri" }, // 삼각형
];

const loader = new GLTFLoader();
const cache = new Map();

// n번째 캐릭터(색)를 한 번만 받아 다듬어 둔다.
export function loadCharacter(n) {
  const url = CHARS[Math.abs(Number(n) || 0) % CHARS.length];
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url).then(polish));
  return cache.get(url);
}

// 원래 모델의 각진 맛은 살리고, 살짝 광택만 준다.
function polish(gltf) {
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    o.material.roughness = 0.55;
    o.material.metalness = 0.0;
  });
  return gltf;
}

const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x120e1f, side: THREE.BackSide });
OUTLINE.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normal * 0.012;");
};

// 장비용 공용 지오메트리 (캐릭터마다 새로 만들지 않는다)
const GEO = {
  pack: new THREE.BoxGeometry(0.2, 0.17, 0.085),
  packLid: new THREE.BoxGeometry(0.215, 0.05, 0.1),
  roll: new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10),
  strap: new THREE.BoxGeometry(0.03, 0.2, 0.02),
  scarf: new THREE.TorusGeometry(0.105, 0.028, 8, 20),
  scarfTail: new THREE.BoxGeometry(0.06, 0.1, 0.02),
  gunBody: new THREE.BoxGeometry(0.06, 0.07, 0.17),
  gunBarrel: new THREE.CylinderGeometry(0.018, 0.022, 0.1, 8),
  gunTip: new THREE.SphereGeometry(0.026, 10, 8),
  gunGrip: new THREE.BoxGeometry(0.04, 0.07, 0.04),
  gem: new THREE.OctahedronGeometry(0.035),
  ring: new THREE.TorusGeometry(0.03, 0.009, 6, 16),
  star: new THREE.OctahedronGeometry(0.032, 0),
  tri: new THREE.ConeGeometry(0.036, 0.05, 3),
  axis: new THREE.BoxGeometry(0.008, 0.06, 0.008),
};

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

// 장면에 놓을 캐릭터 하나: { model, mixer, action(name), muzzle }
export function makeCharacter(gltf, { outline = true, n = 0, team = null } = {}) {
  const model = SkeletonUtils.clone(gltf.scene);
  const meshes = [];
  const bones = {};
  model.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isMesh) {
      meshes.push(o);
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const m = MATHEMATICIANS[Math.abs(Number(n) || 0) % MATHEMATICIANS.length];
  const tCol = teamColor(team, n);
  const gear = [];
  let muzzle = null;

  // 1. 등에 멘 레이더 배낭 + 침낭 + 수학자 문장
  if (bones.torso) {
    const pack = new THREE.Group();
    const packMat = std(m.pack, { roughness: 0.75 });
    const body = new THREE.Mesh(GEO.pack, packMat);
    const lid = new THREE.Mesh(GEO.packLid, std(new THREE.Color(m.pack).multiplyScalar(0.7)));
    lid.position.set(0, 0.08, 0.005);
    const roll = new THREE.Mesh(GEO.roll, std(0xc8a46a, { roughness: 0.9 }));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.125, -0.005);
    pack.add(body, lid, roll);
    // 문장: 배낭 뒷면에 붙어 빛난다 (뒤에서 봐도 누구인지 알 수 있다)
    const emblemMat = new THREE.MeshStandardMaterial({ color: m.emblem, emissive: m.emblem, emissiveIntensity: 0.9, roughness: 0.3 });
    const emblem = new THREE.Group();
    if (m.shape === "axes") {
      const a = new THREE.Mesh(GEO.axis, emblemMat);
      const b = new THREE.Mesh(GEO.axis, emblemMat);
      b.rotation.z = Math.PI / 2;
      emblem.add(a, b);
    } else if (m.shape === "ring") emblem.add(new THREE.Mesh(GEO.ring, emblemMat));
    else if (m.shape === "gem") emblem.add(new THREE.Mesh(GEO.gem, emblemMat));
    else if (m.shape === "star") emblem.add(new THREE.Mesh(GEO.star, emblemMat));
    else {
      const tri = new THREE.Mesh(GEO.tri, emblemMat);
      tri.rotation.x = Math.PI / 2;
      emblem.add(tri);
    }
    emblem.position.set(0, -0.005, -0.05);
    pack.add(emblem);
    pack.position.set(0, 0.1, -0.16);
    // 어깨끈 (팀 색)
    const strapMat = std(tCol, { roughness: 0.5 });
    for (const sx of [-0.065, 0.065]) {
      const strap = new THREE.Mesh(GEO.strap, strapMat);
      strap.position.set(sx, 0.1, 0.125);
      bones.torso.add(strap);
      gear.push(strap);
    }
    bones.torso.add(pack);
    gear.push(pack);
  }

  // 2. 목에 두른 팀 색 스카프 (얼굴은 가리지 않는 목 높이)
  if (bones.torso) {
    const scarfMat = std(tCol, { roughness: 0.45, emissive: tCol, emissiveIntensity: 0.15 });
    const scarf = new THREE.Mesh(GEO.scarf, scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.scale.set(1.15, 1, 1);
    scarf.position.set(0, 0.19, 0.0);
    const tail = new THREE.Mesh(GEO.scarfTail, scarfMat);
    tail.position.set(0.05, 0.15, -0.13);
    tail.rotation.set(0.3, 0, 0.25);
    bones.torso.add(scarf, tail);
    gear.push(scarf, tail);
  }

  // 3. 오른손의 벡터 블래스터 (끝이 빛나고, 쏠 때 번쩍인다)
  if (bones["arm-right"]) {
    const gun = new THREE.Group();
    const metal = std(0x2b3040, { metalness: 0.6, roughness: 0.35 });
    const accent = std(tCol, { roughness: 0.4 });
    const body = new THREE.Mesh(GEO.gunBody, metal);
    const stripe = new THREE.Mesh(GEO.gunGrip, accent);
    stripe.position.set(0, 0.03, -0.02);
    stripe.scale.set(1.6, 0.35, 2.2);
    const grip = new THREE.Mesh(GEO.gunGrip, metal);
    grip.position.set(0, -0.055, -0.04);
    const barrel = new THREE.Mesh(GEO.gunBarrel, metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.005, 0.12);
    const tip = new THREE.Mesh(GEO.gunTip, new THREE.MeshBasicMaterial({ color: 0x7dfcff }));
    tip.position.set(0, 0.005, 0.175);
    gun.add(body, stripe, grip, barrel, tip);
    gun.position.set(-0.2, -0.04, 0.06);
    bones["arm-right"].add(gun);
    gear.push(gun);
    muzzle = tip;
  }

  // 그림자
  for (const g of gear) g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // 카툰 윤곽선: 그래픽 '낮음'이 아닐 때만 씌운다
  if (outline) {
    meshes.forEach((mesh) => {
      if (mesh.isSkinnedMesh) {
        const sk = new THREE.SkinnedMesh(mesh.geometry, OUTLINE);
        sk.bind(mesh.skeleton, mesh.bindMatrix);
        sk.frustumCulled = false;
        mesh.parent.add(sk);
      } else mesh.add(new THREE.Mesh(mesh.geometry, OUTLINE));
    });
  }

  // 동작 재생: walk, idle, jump, emote-yes 등
  const mixer = new THREE.AnimationMixer(model);
  const action = (name) => {
    const clip = THREE.AnimationClip.findByName(gltf.animations, name);
    return clip ? mixer.clipAction(clip) : null;
  };

  return { model, mixer, action, muzzle, mathematician: m.name };
}
