// 탐험가 캐릭터 (Kenney Mini Characters, CC0)를 불러와 세련되고 깔끔한 3D 아바타로 다듬는다.
// 게임 화면(world3d.js)과 첫 화면(intro.js)이 같은 캐릭터를 쓴다.
//   - 당구공처럼 둥글게 부푼 거대 구체를 완전히 배제하고, 깔끔한 미니 휴머노이드 비율 유지
//   - 30도 쿼터뷰에서 얼굴·의상이 입체적으로 살아나도록 5대 수학자별 세련된 시그니처 장착
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
  const url = CHARS[Math.abs(Number(n) || 0) % CHARS.length];
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
    o.material.roughness = 0.35;
    o.material.metalness = 0.05;
  });
  return gltf;
}

const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1b1530, side: THREE.BackSide });
OUTLINE.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normal * 0.018;");
};

// 장면에 놓을 캐릭터 하나: { model, mixer, action(name) }
export function makeCharacter(gltf, { outline = true, n = 0, team = null } = {}) {
  const model = SkeletonUtils.clone(gltf.scene);
  const meshes = [];
  let headBone = null;
  let torsoBone = null;
  model.traverse((o) => {
    if (o.name === "head") headBone = o;
    if (o.name === "torso") torsoBone = o;
    if (o.isMesh) {
      meshes.push(o);
      o.material = o.material.clone();
      o.material.roughness = 0.32;
      o.material.metalness = 0.05;
    }
  });

  // 5대 기하 수학자별 세련된 맞춤 장식 (비율을 파괴하는 거대 구체 제거)
  if (headBone) {
    const mType = Math.abs(Number(n) || 0) % 5;

    // 1. 또렷하고 깔끔한 눈망울 & 눈동자 (정면/사선에서 선명한 표정)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), eyeMat);
    eyeL.position.set(-0.08, 0.04, 0.17);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), eyeMat);
    eyeR.position.set(0.08, 0.04, 0.17);
    headBone.add(eyeL, eyeR);

    // 2. 핑크빛 미니 볼터치
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.75 });
    const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.01), cheekMat);
    cheekL.position.set(-0.12, -0.02, 0.165);
    const cheekR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.01), cheekMat);
    cheekR.position.set(0.12, -0.02, 0.165);
    headBone.add(cheekL, cheekR);

    // 3. 5대 수학자 세련된 시그니처 모자 & 소품
    if (mType === 0) {
      // 0. 데카르트 (Descartes): 세련된 네이비 깃털 챙모자 + 콧수염
      const hatMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.3 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.025, 20), hatMat);
      brim.position.set(0, 0.18, 0);
      brim.rotation.x = -0.08;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.12, 16), hatMat);
      crown.position.set(0, 0.24, 0);
      const featherMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 6), featherMat);
      feather.rotation.z = -0.55;
      feather.position.set(-0.14, 0.28, 0.05);
      headBone.add(brim, crown, feather);

      // 깔끔한 프렌치 콧수염
      const stacheMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
      const stache = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.02), stacheMat);
      stache.position.set(0, -0.04, 0.17);
      headBone.add(stache);
    } else if (mType === 1) {
      // 1. 페르마 (Fermat): 플럼 학사 베레모 + 금테 안경
      const beretMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.3 });
      const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.08, 18), beretMat);
      beret.position.set(0, 0.19, 0);
      beret.rotation.z = 0.1;
      const beretTop = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
      beretTop.position.set(0, 0.24, 0);
      headBone.add(beret, beretTop);

      // 둥근 금테 안경
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.8 });
      const gL = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 6, 12), glassMat);
      gL.position.set(-0.08, 0.04, 0.175);
      const gR = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 6, 12), glassMat);
      gR.position.set(0.08, 0.04, 0.175);
      const gBridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.008), glassMat);
      gBridge.position.set(0, 0.04, 0.175);
      headBone.add(gL, gR, gBridge);
    } else if (mType === 2) {
      // 2. 오일러 (Euler): 스카이블루 실크 캡 + 골드 모노클
      const capMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.23, 0.09, 16), capMat);
      cap.position.set(0, 0.18, 0);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), new THREE.MeshStandardMaterial({ color: 0x10b981 }));
      gem.position.set(0, 0.2, 0.23);
      headBone.add(cap, gem);

      // 골드 외눈 모노클
      const monoMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.8 });
      const mono = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.009, 6, 12), monoMat);
      mono.position.set(0.08, 0.04, 0.175);
      headBone.add(mono);
    } else if (mType === 3) {
      // 3. 가우스 (Gauss): 사각 학사모 (Mortarboard) + 골드 술
      const capMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.3 });
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.02, 0.38), capMat);
      board.position.set(0, 0.22, 0);
      const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.07, 16), capMat);
      skull.position.set(0, 0.17, 0);
      const tasselMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6), tasselMat);
      tassel.position.set(0.16, 0.17, 0.12);
      headBone.add(board, skull, tassel);
    } else {
      // 4. 유클리드 (Euclid): 황금 월계관 + 정돈된 턱수염
      const wreathMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.8 });
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 18), wreathMat);
      wreath.rotation.x = Math.PI / 2 + 0.1;
      wreath.position.set(0, 0.16, 0);
      headBone.add(wreath);

      const beardMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 8), beardMat);
      beard.rotation.x = -Math.PI + 0.2;
      beard.position.set(0, -0.09, 0.15);
      headBone.add(beard);
    }
  }

  // 4. 몸통(torso): 등 뒤 펄럭이는 수학자 고유 망토 + A·B·C·D 팀별 컬러 유니폼 벨트
  if (torsoBone) {
    const mType = Math.abs(Number(n) || 0) % 5;
    const capeColors = [0x1e1b4b, 0x581c87, 0x0284c7, 0x0f766e, 0x334155];
    const capeMat = new THREE.MeshStandardMaterial({ color: capeColors[mType], roughness: 0.4 });
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.46, 0.03), capeMat);
    cape.position.set(0, 0.02, -0.12);
    cape.rotation.x = -0.15; // 자연스럽게 뒤로 펄럭이는 각도
    torsoBone.add(cape);

    // 팀 유니폼 완장 / 가슴 밴드 (A팀: 블루, B팀: 오렌지, C팀: 그린, D팀: 퍼플)
    const teamColors = { A: 0x2563eb, B: 0xf97316, C: 0x16a34a, D: 0x9333ea };
    const tCol = teamColors[team] ?? [0x2563eb, 0xf97316, 0x16a34a, 0x9333ea][Math.abs(Number(n) || 0) % 4];
    const sashMat = new THREE.MeshStandardMaterial({ color: tCol, roughness: 0.3 });
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.22), sashMat);
    sash.position.set(0, -0.04, 0);
    torsoBone.add(sash);
  }

  // 카툰 윤곽선: 그래픽 '낮음'이 아닐 때만 씌운다
  if (outline) {
    meshes.forEach((m) => {
      const line = new THREE.Mesh(m.geometry, OUTLINE);
      m.add(line);
    });
  }

  // 동작 재생: walk, idle, jump, emote-yes 등
  const mixer = new THREE.AnimationMixer(model);
  const action = (name) => {
    const clip = THREE.AnimationClip.findByName(gltf.animations, name);
    return clip ? mixer.clipAction(clip) : null;
  };

  return { model, mixer, action };
}
