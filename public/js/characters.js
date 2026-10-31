// 탐험가 캐릭터 (Kenney Mini Characters, CC0)를 불러와 매끈하게 다듬는다.
// 게임 화면(world3d.js)과 첫 화면(intro.js)이 같은 캐릭터를 쓴다.
//   - 각진 면을 부드러운 음영으로: 꼭짓점을 합쳐 법선을 다시 계산
//   - 만화처럼 또렷하게: 바깥으로 살짝 부풀린 뒷면으로 윤곽선
//   - 30도 쿼터뷰에서 얼굴·의상이 입체적으로 살아나도록 5대 수학자별 대형 시그니처 장착
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
      o.material.roughness = 0.16;
      o.material.metalness = 0.05;
    }
  });

  // 5대 기하 수학자별 고유 캐릭터 외형 (데카르트, 페르마, 오일러, 가우스, 유클리드)
  if (headBone) {
    const mType = Math.abs(Number(n) || 0) % 5;

    // 1. 또렷한 3D 눈망울 (동공 + 반짝이는 하이라이트) - 정면/사선에서 얼굴이 확실히 살아남
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), eyeMat);
    eyeL.scale.set(1, 1.3, 0.4);
    eyeL.position.set(-0.11, 0.06, 0.3);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), eyeMat);
    eyeR.scale.set(1, 1.3, 0.4);
    eyeR.position.set(0.11, 0.06, 0.3);
    headBone.add(eyeL, eyeR);

    // 2. 핑크빛 귀여운 볼터치 (카트라이더/포켓몬 감성)
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.85 });
    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), cheekMat);
    cheekL.scale.set(1.2, 0.7, 0.2);
    cheekL.position.set(-0.21, -0.04, 0.29);
    const cheekR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), cheekMat);
    cheekR.scale.set(1.2, 0.7, 0.2);
    cheekR.position.set(0.21, -0.04, 0.29);
    headBone.add(cheekL, cheekR);

    // 3. 5대 수학자 시그니처 모자 & 헤어 & 의상
    if (mType === 0) {
      // 0. 데카르트 (Descartes): 풍성한 웨이브 흑발 장발 + 프렌치 깃털 모자 + 콧수염 + 레이스 칼라
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.25 });
      const hairMain = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), hairMat);
      hairMain.scale.set(1.18, 1.15, 1.2);
      hairMain.position.set(0, 0.12, -0.04);
      const hairCurlL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), hairMat);
      hairCurlL.scale.set(0.8, 1.8, 0.9);
      hairCurlL.position.set(-0.28, -0.08, 0.02);
      const hairCurlR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), hairMat);
      hairCurlR.scale.set(0.8, 1.8, 0.9);
      hairCurlR.position.set(0.28, -0.08, 0.02);
      headBone.add(hairMain, hairCurlL, hairCurlR);

      // 챙 넓은 모자 + 커다란 흰색 깃털
      const hatMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.2 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.52, 0.04, 24), hatMat);
      brim.position.set(0, 0.28, 0);
      brim.rotation.x = -0.1;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.16, 20), hatMat);
      crown.position.set(0, 0.36, 0);
      const featherMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 8), featherMat);
      feather.rotation.z = -0.6;
      feather.rotation.x = -0.2;
      feather.position.set(-0.22, 0.44, 0.1);
      headBone.add(brim, crown, feather);

      // 프렌치 콧수염 & 화이트 레이스 칼라
      const stacheMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const stacheL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.14, 8), stacheMat);
      stacheL.rotation.z = Math.PI / 3;
      stacheL.position.set(-0.065, -0.075, 0.31);
      const stacheR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.14, 8), stacheMat);
      stacheR.rotation.z = -Math.PI / 3;
      stacheR.position.set(0.065, -0.075, 0.31);
      headBone.add(stacheL, stacheR);
      const collarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 12, 24), collarMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, -0.2, 0.05);
      headBone.add(collar);
    } else if (mType === 1) {
      // 1. 페르마 (Fermat): 로열 플럼 학사 베레모 + 황금 태슬 + 둥근 금테 안경
      const beretMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.25 });
      const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.38, 0.18, 24), beretMat);
      beret.position.set(0, 0.34, 0);
      beret.rotation.z = 0.12;
      const beretTop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
      beretTop.position.set(0, 0.44, 0);
      headBone.add(beret, beretTop);

      // 커다란 금테 안경
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.1, metalness: 0.85 });
      const gL = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 8, 16), glassMat);
      gL.position.set(-0.11, 0.06, 0.31);
      const gR = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 8, 16), glassMat);
      gR.position.set(0.11, 0.06, 0.31);
      const gBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 8), glassMat);
      gBridge.rotation.z = Math.PI / 2;
      gBridge.position.set(0, 0.06, 0.31);
      headBone.add(gL, gR, gBridge);
    } else if (mType === 2) {
      // 2. 오일러 (Euler): 풍성한 실크 터번 캡 + 에메랄드 보석 + 골드 모노클
      const turbanMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 });
      const turban = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), turbanMat);
      turban.scale.set(1.22, 1.18, 1.25);
      turban.position.set(0, 0.18, 0.02);
      const brim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 12, 24), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
      brim.rotation.x = Math.PI / 2;
      brim.position.set(0, 0.14, 0.02);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.1, metalness: 0.6 }));
      gem.position.set(0, 0.22, 0.44);
      headBone.add(turban, brim, gem);

      // 골드 모노클 외눈안경
      const monocleMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.1, metalness: 0.85 });
      const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 16), monocleMat);
      monocle.position.set(0.11, 0.06, 0.32);
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 6), monocleMat);
      chain.position.set(0.19, 0.01, 0.3);
      headBone.add(monocle, chain);
    } else if (mType === 3) {
      // 3. 가우스 (Gauss): 사각 학사모(Mortarboard) + 황금 술 + 깃펜
      const capMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.2 });
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.72), capMat);
      board.position.set(0, 0.38, 0);
      const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.14, 20), capMat);
      skull.position.set(0, 0.28, 0);
      const tasselMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2 });
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), tasselMat);
      tassel.position.set(0.32, 0.28, 0.25);
      headBone.add(board, skull, tassel);

      // 깃펜
      const quillMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const quill = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 8), quillMat);
      quill.rotation.z = -0.45;
      quill.position.set(-0.28, 0.42, 0);
      headBone.add(quill);
    } else {
      // 4. 유클리드 (Euclid): 풍성한 그리스 백발 + 대형 황금 월계관 + 풍성한 백색 턱수염
      const hairMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 16), hairMat);
      hair.scale.set(1.18, 1.15, 1.2);
      hair.position.set(0, 0.12, 0);
      headBone.add(hair);

      // 황금 월계관
      const wreathMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.15, metalness: 0.85 });
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.04, 12, 24), wreathMat);
      wreath.rotation.x = Math.PI / 2 + 0.15;
      wreath.position.set(0, 0.22, 0.02);
      for (let i = 0; i < 10; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), wreathMat);
        leaf.scale.set(0.5, 1.9, 0.3);
        const ang = (i / 10) * Math.PI * 2;
        leaf.position.set(Math.cos(ang) * 0.38, 0.22, Math.sin(ang) * 0.38);
        leaf.rotation.y = -ang;
        headBone.add(leaf);
      }
      headBone.add(wreath);

      // 풍성한 현자의 턱수염
      const beardMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.32, 12), beardMat);
      beard.rotation.x = -Math.PI + 0.25;
      beard.position.set(0, -0.16, 0.28);
      headBone.add(beard);
    }
  }

  // 4. 몸통(torso): 등 뒤 펄럭이는 수학자 고유 망토 + 팀 컬러 튜닉 벨트 (뒤/위에서도 100% 구별!)
  if (torsoBone) {
    const mType = Math.abs(Number(n) || 0) % 5;
    const capeColors = [0x1e1b4b, 0x581c87, 0x0284c7, 0x0f766e, 0xf8fafc];
    const capeMat = new THREE.MeshStandardMaterial({ color: capeColors[mType], roughness: 0.3 });
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.06), capeMat);
    cape.position.set(0, 0.08, -0.18);
    cape.rotation.x = -0.18; // 살짝 뒤로 펄럭이는 각도
    torsoBone.add(cape);

    // 팀 유니폼 완장 / 가슴 밴드 (A팀: 레드, B팀: 블루, C팀: 그린, D팀: 골드)
    const teamColors = { A: 0xef4444, B: 0x3b82f6, C: 0x10b981, D: 0xeab308 };
    const tCol = teamColors[team] ?? [0xef4444, 0x3b82f6, 0x10b981, 0xeab308][Math.abs(Number(n) || 0) % 4];
    const sashMat = new THREE.MeshStandardMaterial({ color: tCol, roughness: 0.25 });
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.34), sashMat);
    sash.position.set(0, -0.02, 0);
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
