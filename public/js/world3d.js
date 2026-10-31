// 유적 3D 화면 (Three.js). 규칙은 game.js가 갖고, 여기서는 그 상태를 그린다.
// 모델: Kenney Mini Dungeon / Mini Characters (CC0). 지도 한 칸 = 3D 공간 1, 지도 (x, y) → (x, 0, y).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { loadCharacter, makeCharacter, teamColor } from "./characters.js";
import { Particles, glowSprite, brickTexture, slabTexture, lavaTexture, waterTexture, aimTexture } from "./fx.js";
import { settings } from "./settings.js";
import { W, H, ROOMS, roomAt, DOORS, DOOR_COLS, DOOR_ROWS, BRIDGES, OBJECTS, ALTAR, PLATFORMS, TARGETS, TABLETS } from "./game.js";

const DUNGEON = ["floor", "floor-detail", "wall", "gate", "chest", "pot", "barrel", "coin", "key", "stairs", "banner", "column"];
const BOLT_SPEED = 9; // 사격 탄환의 속도(초당 칸) — game.js의 규칙과 짝을 이룬다
const BOLT_TTL = 1.5; // 탄환이 사라지기까지의 시간(초)
const HAZARD = {
  "~": { color: 0x3b9be0, y: -0.12, opacity: 0.88, emissive: 0x0a2a4a },
  "^": { color: 0x0b0812, y: -0.9, opacity: 1, emissive: 0x000000 },
  "!": { color: 0xff5a1f, y: -0.15, opacity: 1, emissive: 0xff3d00 },
};

const loader = new GLTFLoader();
const cache = new Map();
const load = (url) => {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url);
};

function shadows(obj, cast = true, receive = true) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  return obj;
}

// 같은 모델을 여러 칸에 놓을 때 한 번에 그린다 (크롬북에서도 가볍게).
function instanced(template, matrices, colors) {
  const group = new THREE.Group();
  template.updateMatrixWorld(true);
  template.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, matrices.length);
    const m = new THREE.Matrix4();
    matrices.forEach((t, i) => {
      im.setMatrixAt(i, m.multiplyMatrices(t, mesh.matrixWorld));
      if (colors) im.setColorAt(i, colors[i]);
    });
    im.castShadow = true;
    im.receiveShadow = true;
    group.add(im);
  });
  return group;
}

function tileMatrix(x, z, { y = 0, rot = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot),
    new THREE.Vector3(sx, sy, sz),
  );
}

// 글자 표지판 (이름표, 안내 말풍선)
function makeLabel(text, { bg = "rgba(12,10,22,0.82)", fg = "#fff", size = 30, height = 0.32, border = "rgba(255,255,255,0.18)" } = {}) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  const font = `bold ${size}px Pretendard, "Malgun Gothic", "Noto Sans KR", sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + size;
  c.width = w;
  c.height = Math.ceil(size * 1.6);
  ctx.font = font;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(2, 2, c.width - 4, c.height - 4, (c.height - 4) / 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = border;
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 4;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, c.width / 2, c.height / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set((height * c.width) / c.height, height, 1);
  sprite.renderOrder = 10;
  return sprite;
}

// 표적 위의 체력 바: 맞힐수록 줄어든다
function makeBar(hits, total = 10) {
  const c = document.createElement("canvas");
  c.width = 220; c.height = 44;
  const ctx = c.getContext("2d");
  const left = Math.max(0, total - hits) / total;
  ctx.fillStyle = "rgba(10,6,20,0.85)";
  ctx.beginPath(); ctx.roundRect(2, 8, 216, 30, 8); ctx.fill();
  ctx.strokeStyle = "rgba(255,138,216,0.7)"; ctx.lineWidth = 2; ctx.stroke();
  const g = ctx.createLinearGradient(0, 0, 220, 0);
  g.addColorStop(0, "#ff2fb3"); g.addColorStop(1, "#ffb3ec");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(7, 13, 206 * left, 20, 5); ctx.fill();
  ctx.font = "bold 18px Pretendard, sans-serif";
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${total - hits} / ${total}`, 110, 24);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(1.3, 0.26, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function disposeLabel(sprite) {
  sprite.material.map.dispose();
  sprite.material.dispose();
}

export class World3D {
  // hooks: isDoorOpen(id), isLabDone(lab), isSolved(pid), relics() → [bool × 7], hasState(), onInteract(target)
  constructor(canvas, game, hooks) {
    this.cv = canvas;
    this.game = game;
    this.h = hooks;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    // 그래픽 '낮음'(메뉴 설정): 화면 해상도·그림자·윤곽선을 줄여 느린 크롬북에서도 부드럽게
    this.quality = settings.quality;
    const low = this.quality === "low";
    this.renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = !low;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // 영화처럼 밝은 곳은 부드럽게, 어두운 곳은 깊게 (횃불·용암 빛이 살아난다)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0a14);
    this.scene.fog = new THREE.Fog(0x0c0a14, 15, 30);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xb7c2ff, 0x1c1428, 0.85));
    this.sun = new THREE.DirectionalLight(0xffe6c8, 1.55);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 40 });
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);
    // 뒤쪽에서 비추는 차가운 빛: 캐릭터와 물체 가장자리가 반짝여 입체감이 산다
    this.rim = new THREE.DirectionalLight(0x8fc8ff, 1.4);
    this.scene.add(this.rim, this.rim.target);
    // 정면 보조광(필 라이트): 캐릭터 얼굴이 어둡게 묻히지 않게 카메라 쪽에서 밝혀 준다
    this.fill = new THREE.DirectionalLight(0xfff2dd, 0.7);
    this.scene.add(this.fill, this.fill.target);

    // 횃불 빛: 몇 개의 점광원을 플레이어 가까운 횃불로 옮겨 가며 쓴다 (크롬북에서도 가볍게)
    this.torches = [];
    this.torchLights = Array.from({ length: low ? 2 : 5 }, () => {
      const l = new THREE.PointLight(0xff9a3c, 0, 7, 1.4);
      this.scene.add(l);
      return l;
    });
    // 사격 섬광: 쏠 때와 맞힐 때 잠깐 번쩍이는 빛
    this.flashLight = new THREE.PointLight(0x7dfcff, 0, 6, 1.5);
    this.scene.add(this.flashLight);

    // 파티클: 빛나는 불꽃·스파크(더하기 합성)와 흙먼지(보통 합성)
    this.sparks = new Particles(this.scene, { max: low ? 300 : 700, additive: true, soft: 0.0 });
    this.dust = new Particles(this.scene, { max: low ? 120 : 260, additive: false, soft: 0.2 });
    this.motes = []; // 공중을 떠다니는 먼지 티끌
    this.shake = 0; // 화면 흔들림 세기 (0~1)
    this.kick = new THREE.Vector3(); // 사격 반동
    this.lead = new THREE.Vector3(); // 진행 방향으로 살짝 앞을 보여 주는 카메라
    this.camLook = new THREE.Vector3();
    this.stepT = 0;
    this.wasAir = false;
    this.popTexts = [];

    this.mixers = [];
    this.avatars = new Map(); // n(나는 "me") → 캐릭터
    this.objects = new Map(); // pid → { root, kind, solved, key, ring, mixer, clip }
    this.doors = new Map(); // id → { gates: [{mixer, clip}], open }
    this.bridges = new Map(); // lab → { planks, marker, done }
    this.hazards = [];
    this.coins = [];
    this.bolts = []; // 사격 탄환(네온 벡터 탄)
    this.targets = new Map(); // zone → { t, crystal, ring, label, hits, done, flash }
    this.prompt = null;
    this.promptText = "";

    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    canvas.addEventListener("pointerdown", (e) => this.onPointer(e));
  }

  resize() {
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const px = h * this.renderer.getPixelRatio();
    this.sparks?.setViewport(px, this.camera.fov);
    this.dust?.setViewport(px, this.camera.fov);
  }

  async init() {
    const models = Object.fromEntries(await Promise.all(DUNGEON.map(async (n) => [n, await load(`/models/dungeon/${n}.glb`)])));
    this.models = models;
    this.buildStatic(models);
    this.buildDoors(models);
    this.buildObjects(models);
    this.buildTablets(models);
    this.buildBridges();
    this.buildAltar(models);
    this.buildPlatforms();
    this.buildTargets();
    this.buildVectorHolograms();
    this.buildTorches();
    // 사격 탄환용 공용 지오메트리·재료 (네온 벡터 탄: 길쭉한 빛줄기)
    this.boltGeo = new THREE.CapsuleGeometry(0.07, 0.36, 4, 8);
    this.boltGeo.rotateX(Math.PI / 2);
    this.boltMat = new THREE.MeshBasicMaterial({ color: 0xd9feff });
    this.resize();
  }

  start() {
    const clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;
      // 문제·개념 창이 열려 있는 동안은 3D 화면을 멈춘다 (화면에는 마지막 장면이 그대로 남는다).
      // 크롬북에서 창이 뜰 때 버벅이던 원인: 창 뒤에서 3D를 계속 그리느라 수식 조판·그림이 늦어졌다.
      if (this.ready && this.h.paused?.()) { this.wasPaused = true; return; }
      if (this.wasPaused) { this.wasPaused = false; return; } // 창을 닫은 첫 프레임은 시간 간격을 버린다
      this.game.update(dt, t * 1000);
      this.sync(dt, t);
      this.renderer.render(this.scene, this.camera);
    });
  }

  // ---------- 고정된 지형 ----------
  buildStatic(m) {
    const grid = this.game.grid;
    const floors = [], floorColors = [], details = [], detailColors = [], walls = [], banners = [];
    // 방 색은 살리되 돌바닥처럼 차분하게
    const tint = ROOMS.map((r) => new THREE.Color(r.tint).lerp(new THREE.Color(0x6e6680), 0.5));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = grid[y][x];
      if (ch === "#") {
        walls.push(tileMatrix(x + 0.5, y + 0.5, { sy: y === H - 1 ? 0.25 : 1 })); // 앞줄 벽은 낮게: 방 안이 보이도록
        if (y === 0 && x % 4 === 2 && grid[1][x] === ".") banners.push(tileMatrix(x + 0.5, 1.5));
        continue;
      }
      if ("~^!".includes(ch) || BRIDGES[ch]) continue;
      const fancy = ((x * 7 + y * 13) % 9) === 0;
      (fancy ? details : floors).push(tileMatrix(x + 0.5, y + 0.5));
      (fancy ? detailColors : floorColors).push(tint[roomAt(x + 0.5)]);
    }
    this.scene.add(
      instanced(m.floor.scene, floors, floorColors),
      instanced(m["floor-detail"].scene, details, detailColors),
      instanced(m.wall.scene, walls),
      instanced(m.banner.scene, banners),
    );

    // 물·절벽·용암: 다리마다 세로로 긴 띠
    for (const br of Object.values(BRIDGES)) {
      const hz = HAZARD[br.hazard];
      let map = null;
      if (br.hazard === "!") { map = lavaTexture(); map.repeat.set(1, (H - 2) / 2); }
      if (br.hazard === "~") { map = waterTexture(); map.repeat.set(1, (H - 2) / 2); }
      const mat = new THREE.MeshStandardMaterial({
        color: map ? 0xffffff : hz.color, map, emissive: br.hazard === "!" ? 0xffffff : hz.emissive,
        emissiveMap: br.hazard === "!" ? map : null, emissiveIntensity: br.hazard === "!" ? 1.1 : 0.35,
        roughness: br.hazard === "~" ? 0.12 : 0.9, metalness: br.hazard === "~" ? 0.2 : 0,
        transparent: hz.opacity < 1, opacity: hz.opacity,
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, H - 2), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(br.cx, hz.y, H / 2);
      plane.receiveShadow = true;
      this.scene.add(plane);
      this.hazards.push({ kind: br.hazard, mat, map, base: mat.emissiveIntensity, cx: br.cx });
      if (br.hazard === "!") {
        // 용암 빛: 주변 벽과 바닥을 붉게 물들인다
        for (const z of [3.5, 7.5, 11.5]) {
          const l = new THREE.PointLight(0xff5a1f, 5, 6, 1.3);
          l.position.set(br.cx, 0.8, z);
          this.scene.add(l);
        }
      }
      if (br.hazard === "^") {
        // 절벽 양쪽 벽면
        for (const side of [-1, 1]) {
          const cliff = new THREE.Mesh(new THREE.PlaneGeometry(H - 2, 0.9), new THREE.MeshStandardMaterial({ color: 0x2a2233, roughness: 1 }));
          cliff.rotation.y = side * Math.PI / 2;
          cliff.position.set(br.cx - side, -0.45, H / 2);
          this.scene.add(cliff);
        }
      }
    }
  }

  buildDoors(m) {
    for (const [id, col] of Object.entries(DOOR_COLS)) {
      const gates = [];
      for (const r of DOOR_ROWS) {
        const g = shadows(m.gate.scene.clone(true));
        g.position.set(col + 0.5, 0, r + 0.5);
        g.rotation.y = Math.PI / 2;
        g.scale.set(1.25, 1.45, 1.25);
        this.scene.add(g);
        const mixer = new THREE.AnimationMixer(g);
        this.mixers.push(mixer);
        gates.push({ mixer, clip: THREE.AnimationClip.findByName(m.gate.animations, "open") });
      }
      this.doors.set(id, { gates, open: false });
    }
  }

  buildObjects(m) {
    const ringGeo = new THREE.RingGeometry(0.42, 0.55, 32);
    for (const o of OBJECTS) {
      const src = m[o.model];
      const root = shadows(src.scene.clone(true));
      root.position.set(o.x + 0.5, 0, o.y + 0.5);
      root.scale.setScalar(o.model === "chest" ? 1.5 : 1.25);
      this.scene.add(root);
      const key = shadows(m.key.scene.clone(true), true, false);
      key.scale.setScalar(0.7);
      key.position.set(o.x + 0.5, 1.15, o.y + 0.5);
      this.scene.add(key);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.6, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(o.x + 0.5, 0.02, o.y + 0.5);
      this.scene.add(ring);
      const mixer = src.animations.length ? new THREE.AnimationMixer(root) : null;
      if (mixer) this.mixers.push(mixer);
      this.objects.set(o.pid, { root, kind: o.model, key, ring, mixer, clip: THREE.AnimationClip.findByName(src.animations, "open"), solved: false, tip: 0 });
    }
  }

  // 교과서 핵심 개념·정리 비석: 기둥 모델 위에 빛나는 룬 크리스탈과 바닥 마법진
  buildTablets(m) {
    const ringGeo = new THREE.RingGeometry(0.38, 0.52, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, depthWrite: false });
    for (const t of TABLETS) {
      const col = shadows(m.column.scene.clone(true));
      col.position.set(t.x + 0.5, 0, t.y + 0.5);
      col.scale.set(0.9, 0.85, 0.9);
      this.scene.add(col);

      // 위에 떠 있는 빛나는 비석 엠블럼 (마름모 네온 크리스탈)
      const rune = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.24),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.6 })
      );
      rune.position.set(t.x + 0.5, 1.45, t.y + 0.5);
      this.scene.add(rune);

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(t.x + 0.5, 0.02, t.y + 0.5);
      this.scene.add(ring);
    }
  }

  buildBridges() {
    const plankMat = new THREE.MeshStandardMaterial({ color: 0xa0662b, roughness: 0.8 });
    const plankGeo = new THREE.BoxGeometry(0.28, 0.12, 2.1); // 걷는 방향(x)과 직각으로 놓인 판자
    const markGeo = new THREE.BoxGeometry(2, 0.04, 2);
    const gemGeo = new THREE.OctahedronGeometry(0.22);
    for (const br of Object.values(BRIDGES)) {
      const planks = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(plankGeo, plankMat);
        p.position.set(-0.83 + i * 0.33, 0, 0);
        p.castShadow = p.receiveShadow = true;
        planks.add(p);
      }
      planks.position.set(br.cx, -0.02, br.cy);
      planks.visible = false;
      const marker = new THREE.Group();
      const glow = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.35, depthWrite: false }));
      const gem = new THREE.Mesh(gemGeo, new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x22d3ee, emissiveIntensity: 1.5 }));
      gem.position.y = 0.9;
      marker.add(glow, gem);
      marker.position.set(br.cx, 0.02, br.cy);
      this.scene.add(planks, marker);
      this.bridges.set(br.lab, { planks, marker, glow, gem, done: false, grow: 0 });
    }
  }

  buildAltar(m) {
    const stairs = shadows(m.stairs.scene.clone(true));
    stairs.position.set(ALTAR.x + 0.5, 0, ALTAR.y + 0.5);
    this.scene.add(stairs);
    for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
      const c = shadows(m.column.scene.clone(true));
      c.position.set(ALTAR.x + 0.5 + dx, 0, ALTAR.y + 0.5 + dz);
      c.scale.set(0.8, 1.3, 0.8);
      this.scene.add(c);
    }
    // 유물 7개: 반 전체가 깨우면 금빛으로 바뀐다
    this.coinRing = new THREE.Group();
    this.coinRing.position.set(ALTAR.x + 0.5, 1.7, ALTAR.y + 0.5);
    for (let i = 0; i < 7; i++) {
      const coin = m.coin.scene.clone(true);
      const mats = [];
      coin.traverse((o) => {
        if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(0x555566); mats.push(o.material); o.castShadow = true; }
      });
      const a = (i / 7) * Math.PI * 2;
      coin.position.set(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25);
      coin.scale.setScalar(1.3);
      this.coinRing.add(coin);
      this.coins.push({ coin, mats, lit: false });
    }
    this.scene.add(this.coinRing);
  }

  // 로블록스풍 수직 발판: 점프로 딛고 올라가는 계단·부유 디딤돌·기둥 블록
  buildPlatforms() {
    // 고대 돌 블록: 옆면은 벽돌, 윗면은 금빛 테두리 판석. 높이별로 벽돌 무늬 반복을 맞춘다.
    const brick = brickTexture();
    const topMat = new THREE.MeshStandardMaterial({ map: slabTexture(), roughness: 0.7 });
    const sideMats = new Map();
    const sideMat = (ph) => {
      if (!sideMats.has(ph)) {
        const map = brick.clone();
        map.needsUpdate = true;
        map.repeat.set(1, ph);
        sideMats.set(ph, new THREE.MeshStandardMaterial({ map, roughness: 0.9 }));
      }
      return sideMats.get(ph);
    };
    for (const [key, ph] of PLATFORMS) {
      const [x, y] = key.split(",").map(Number);
      const sm = sideMat(ph);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.96, ph, 0.96), [sm, sm, topMat, sm, sm, sm]);
      box.position.set(x + 0.5, ph / 2, y + 0.5);
      box.castShadow = box.receiveShadow = true;
      this.scene.add(box);
    }
  }

  // 사격 표적(네온 수정체): 구역마다 하나, 10발을 맞히면 그 구역의 핵심 개념 카드가 열린다
  buildTargets() {
    const geo = new THREE.OctahedronGeometry(0.34);
    const ringGeo = new THREE.RingGeometry(0.36, 0.52, 32);
    for (const t of TARGETS) {
      const crystal = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xff8ad8, emissive: 0xff2fb3, emissiveIntensity: 1.5 }));
      crystal.position.set(t.x, 1.05, t.y);
      crystal.castShadow = true;
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff6ad5, transparent: true, opacity: 0.5, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(t.x, 0.03, t.y);
      this.scene.add(crystal, ring);
      const label = makeBar(0);
      label.position.set(t.x, 1.75, t.y);
      const halo = glowSprite(0xff4fc8, 1.6, 0.55);
      halo.position.set(t.x, 1.05, t.y);
      this.scene.add(halo);
      this.scene.add(label);
      this.targets.set(t.zone, { t, crystal, ring, label, halo, labelCount: 0, hits: 0, done: false, flash: 0 });
    }
  }

  // ---------- 기하 벡터 3D 좌표계 및 네온 벡터 홀로그램 ----------
  buildVectorHolograms() {
    this.vectorHolograms = [];
    // 방마다 떠 있던 좌표축은 화면을 어지럽혀서 제단 위에만 남긴다
    const points = [{ x: ALTAR.x + 0.5, y: 2.3, z: ALTAR.y + 0.5 }];
    for (const p of points) {
      const g = new THREE.Group();
      g.position.set(p.x, p.y, p.z);
      // X, Y, Z 3차원 직교 좌표축 화살표
      const ax = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.2, 0xef4444, 0.35, 0.2);
      const ay = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.2, 0x22c55e, 0.35, 0.2);
      const az = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 1.2, 0x3b82f6, 0.35, 0.2);
      // 벡터 합 마법진 화살표: a + b = sum
      const a = new THREE.ArrowHelper(new THREE.Vector3(0.8, 0, 0.6).normalize(), new THREE.Vector3(0, 0, 0), 1.1, 0x5eead4, 0.3, 0.18);
      const sum = new THREE.ArrowHelper(new THREE.Vector3(0.8, 0.7, 0.6).normalize(), new THREE.Vector3(0, 0, 0), 1.6, 0xfde68a, 0.4, 0.22);
      g.add(ax, ay, az, a, sum);
      this.scene.add(g);
      this.vectorHolograms.push(g);
    }

    // 플레이어 앞 바닥의 조준 화살표(진행 방향 벡터): 사격이 나가는 방향을 보여 준다
    const aim = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 1.0),
      new THREE.MeshBasicMaterial({ map: aimTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    aim.rotation.x = -Math.PI / 2;
    aim.position.set(0, 0, -1.05);
    this.aim = new THREE.Group();
    this.aim.add(aim);
    this.aim.renderOrder = 4;
    this.scene.add(this.aim);
  }

  // 벽에 건 횃불: 불꽃 스프라이트는 모두 그리고, 실제 빛은 가까운 몇 개만 켠다
  buildTorches() {
    const grid = this.game.grid;
    const spots = [];
    for (let x = 2; x < W - 2; x++) {
      if (x % 4 === 0 && grid[1][x] !== "#" && !"~^!".includes(grid[1][x])) spots.push([x + 0.5, 0.92, 0]); // 뒷벽
    }
    for (const col of Object.values(DOOR_COLS)) {
      for (const r of [DOOR_ROWS[0] - 1.5, DOOR_ROWS[DOOR_ROWS.length - 1] + 2.5]) {
        spots.push([col - 0.08, r, -1], [col + 1.08, r, 1]); // 문 양옆 기둥
      }
    }
    const holderGeo = new THREE.CylinderGeometry(0.05, 0.035, 0.32, 6);
    const cupGeo = new THREE.CylinderGeometry(0.11, 0.06, 0.12, 8);
    const metal = new THREE.MeshStandardMaterial({ color: 0x3a3030, roughness: 0.6, metalness: 0.5 });
    for (const [x, z, side] of spots) {
      const g = new THREE.Group();
      g.position.set(x, 1.45, z + (side === 0 ? 0.12 : 0));
      const holder = new THREE.Mesh(holderGeo, metal);
      holder.rotation.x = side === 0 ? 0.5 : 0;
      holder.rotation.z = side === 0 ? 0 : -side * 0.5;
      const cup = new THREE.Mesh(cupGeo, metal);
      cup.position.set(side * 0.07, 0.17, side === 0 ? 0.08 : 0);
      const flame = glowSprite(0xff9a30, 0.9, 1);
      flame.position.set(side * 0.07, 0.33, side === 0 ? 0.08 : 0);
      const core = glowSprite(0xfff1b0, 0.35, 1);
      core.position.copy(flame.position);
      g.add(holder, cup, flame, core);
      this.scene.add(g);
      this.torches.push({ g, flame, core, seed: Math.random() * 10, pos: new THREE.Vector3(x + side * 0.07, 1.85, z + (side === 0 ? 0.35 : 0)) });
    }
  }

  // 사격: 전방(me.dir)으로 네온 벡터 탄환을 하나 쏜다. 명중·소멸은 sync에서 처리한다.
  shoot() {
    const g = this.game;
    const dir = g.me.dir, len = Math.hypot(dir[0], dir[1]) || 1;
    const dx = dir[0] / len, dz = dir[1] / len;
    const y = 0.7 + (g.me.jumpY ?? 0);
    const sx = g.me.x + dx * 0.45, sz = g.me.y + dz * 0.45;
    const mesh = new THREE.Mesh(this.boltGeo, this.boltMat.clone());
    mesh.position.set(sx, y, sz);
    mesh.rotation.y = Math.atan2(dx, dz);
    const glow = glowSprite(0x5ff6ff, 0.6, 0.8);
    mesh.add(glow);
    this.scene.add(mesh);
    this.bolts.push({ mesh, glow, vx: dx * BOLT_SPEED, vz: dz * BOLT_SPEED, ttl: BOLT_TTL });
    // 총구 섬광, 반동, 살짝 흔들림
    this.sparks.burst(sx, y, sz, { count: 8, speed: 2.2, up: 0.6, life: 0.16, size: 0.12, color: 0x9ffcff, gravity: 0 });
    this.sparks.emit({ x: sx, y, z: sz, life: 0.07, size: 0.45, color: 0xc8ffff });
    this.flashLight.position.set(sx, y + 0.2, sz);
    this.flashLight.color.set(0x7dfcff);
    this.flashLight.intensity = 9;
    this.kick.set(-dx * 0.12, 0, -dz * 0.12);
    this.shake = Math.min(1, this.shake + 0.12);
    const me = this.avatars.get("me");
    if (me?.model) me.recoil = 1;
  }

  // 공중에 떠오르며 사라지는 글자 (+1, HIT!, CLEAR!)
  popText(text, x, y, z, color = "#ffe066", size = 0.36) {
    const label = makeLabel(text, { bg: "rgba(0,0,0,0)", fg: color, size: 40, height: size, border: "rgba(0,0,0,0)" });
    label.position.set(x + (Math.random() - 0.5) * 0.3, y, z);
    this.scene.add(label);
    this.popTexts.push({ label, life: 0.8, max: 0.8, vy: 1.6 });
  }

  // ---------- 캐릭터 ----------
  avatar(key, n, team = null) {
    let av = this.avatars.get(key);
    if (av) return av;
    const group = new THREE.Group();
    group.rotation.y = Math.PI; // 모델은 -z를 보고 있으므로 처음에는 카메라 쪽(+z)을 보게 돌린다
    av = { group, n, team, key, label: null, labelText: "", model: null, mixer: null, actions: null, current: null };
    this.avatars.set(key, av);
    this.scene.add(group);
    loadCharacter(n).then((gltf) => {
      if (this.avatars.get(key) !== av) return; // 그새 나갔으면 버린다
      const { model, mixer, action, muzzle } = makeCharacter(gltf, { outline: this.quality !== "low", n, team });
      model.scale.setScalar(1.7);
      group.add(model);
      // 발밑: 둥근 그림자 + 팀 색 링 (내 캐릭터는 더 밝게 빛난다)
      const col = teamColor(team, n);
      const isMe = key === "me";
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.36, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.015;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, isMe ? 0.5 : 0.46, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: isMe ? 0.9 : 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      group.add(shadow, ring);
      // 엑스레이 실루엣: 비석·기둥·발판 뒤로 들어가 가려지면 캐릭터 윤곽이 팀 색으로 비쳐 보인다.
      // 가려진 부분(깊이가 더 깊은 곳)에만 그려지는 재질을 같은 뼈대에 한 번 더 씌운다.
      // 그리는 순서: 지형(0) → 실루엣(9) → 캐릭터(10). 실루엣은 지형에 가려진 곳에만 남고, 보이는 곳은 캐릭터가 덮는다.
      const xray = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(isMe ? 1 : 0.7), depthWrite: false, depthFunc: THREE.GreaterDepth });
      const skinned = [];
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.renderOrder = 10;
        if (o.isSkinnedMesh && o.material.side !== THREE.BackSide) skinned.push(o); // 윤곽선(뒷면)은 빼고
      });
      for (const m of skinned) {
        const ghost = new THREE.SkinnedMesh(m.geometry, xray);
        ghost.bind(m.skeleton, m.bindMatrix);
        ghost.frustumCulled = false;
        ghost.renderOrder = 9;
        m.parent.add(ghost);
      }
      Object.assign(av, { ring, shadow, muzzle, recoil: 0 });
      Object.assign(av, { model, mixer, actions: { idle: action("idle"), walk: action("walk"), yes: action("emote-yes"), jump: action("jump") } });
      av.actions.idle.play();
      av.current = "idle";
    });
    return av;
  }

  setAnim(av, name) {
    if (!av.actions || av.current === name) return;
    av.actions[name].reset().fadeIn(0.15).play();
    av.actions[av.current].fadeOut(0.15);
    av.current = name;
  }

  placeAvatar(av, x, y, dir, moving, name, isMe, jumpY = 0, air = false) {
    av.group.position.set(x, jumpY, y);
    if (moving) {
      // 모델은 기본 회전(0°)에서 전면(+Z, 카메라 쪽)을 향한다.
      // 진행 방향(dir)으로 부드럽게 돌아 걷는다: W(전진, -Z)면 등을 보고 전방으로, S(후진, +Z)면 정면을 보고 걷는다.
      const target = Math.atan2(-dir[0], dir[1]);
      let d = target - av.group.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      av.group.rotation.y += d * 0.3;
    }
    // 공중에 떠 있으면 점프 애니메이션, 아니면 걷기·대기 (인사 중일 때는 건드리지 않는다)
    if (air && jumpY > 0.02) this.setAnim(av, "jump");
    else if (av.current !== "yes") this.setAnim(av, moving ? "walk" : "idle");
    if (av.labelText !== name) {
      if (av.label) { av.group.remove(av.label); disposeLabel(av.label); }
      const col = "#" + new THREE.Color(teamColor(av.team, av.n)).getHexString();
      av.label = makeLabel(isMe ? `▼ ${name}` : name, { bg: isMe ? "rgba(10,40,44,0.92)" : "rgba(12,10,22,0.78)", fg: isMe ? "#7dfcff" : "#fff", border: col, size: 28, height: 0.28 });
      av.label.position.y = 1.6;
      av.group.add(av.label);
      av.labelText = name;
    }
  }

  cheer() {
    const av = this.avatars.get("me");
    if (!av?.actions) return;
    this.setAnim(av, "yes");
    av.actions.yes.setLoop(THREE.LoopOnce, 1);
    av.actions.yes.clampWhenFinished = true;
    setTimeout(() => { if (av.current === "yes") this.setAnim(av, "idle"); }, 1200);
  }

  // ---------- 매 프레임 ----------
  sync(dt, t) {
    const g = this.game;
    for (const mx of this.mixers) mx.update(dt);

    // 나와 친구들
    if (g.me.n !== null) {
      const myTeam = this.h.teamOf ? this.h.teamOf(g.me.n) : null;
      const me = this.avatar("me", g.me.n, myTeam);
      this.placeAvatar(me, g.me.x, g.me.y, g.me.dir, g.me.moving, g.me.name, true, g.me.jumpY ?? 0, !!g.me.air);
      me.mixer?.update(dt);
    }
    for (const [n, o] of g.others) {
      const otherTeam = this.h.teamOf ? this.h.teamOf(n) : null;
      const av = this.avatar(n, n, otherTeam);
      this.placeAvatar(av, o.x, o.y, o.dir, o.moving, g.names.get(n) ?? "", false);
      av.mixer?.update(dt);
    }
    for (const [key, av] of this.avatars) {
      if (key !== "me" && !g.others.has(key)) {
        this.scene.remove(av.group);
        if (av.label) disposeLabel(av.label);
        this.avatars.delete(key);
      }
    }

    // 문
    for (const [id, door] of this.doors) {
      const open = this.h.isDoorOpen(id);
      if (open && !door.open) {
        for (const gt of door.gates) {
          const a = gt.mixer.clipAction(gt.clip);
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
          a.reset().play();
          if (!this.ready) gt.mixer.update(gt.clip.duration); // 처음 불러올 때 이미 열린 문은 바로 연 상태로
        }
      }
      door.open = open;
    }

    // 상자류
    for (const [pid, ob] of this.objects) {
      const solved = this.h.isSolved(pid);
      if (solved && !ob.solved) {
        if (ob.mixer && ob.clip) {
          const a = ob.mixer.clipAction(ob.clip);
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
          a.reset().play();
          if (!this.ready) ob.mixer.update(ob.clip.duration);
        }
        if (this.ready) {
          this.cheer();
          // 보물 획득: 금빛 폭죽
          const p = ob.root.position;
          this.sparks.burst(p.x, 0.9, p.z, { count: 50, speed: 3.5, up: 5, life: 1.1, size: 0.16, color: 0xffd34d });
          this.sparks.burst(p.x, 0.9, p.z, { count: 20, speed: 2, up: 4, life: 1.3, size: 0.1, color: 0xffffff });
          this.popText("🗝️ +1", p.x, 1.8, p.z, "#ffe066", 0.5);
          this.shake = Math.min(1, this.shake + 0.4);
        }
      }
      ob.solved = solved;
      ob.key.visible = !solved;
      ob.ring.visible = !solved;
      if (!solved) {
        ob.key.rotation.y = t * 2;
        ob.key.position.y = 1.15 + Math.sin(t * 2.5) * 0.08;
        ob.ring.material.opacity = 0.35 + 0.3 * Math.sin(t * 3);
      } else if (!ob.mixer) {
        ob.tip = Math.min(1, ob.tip + dt * 3); // 항아리·통은 옆으로 쓰러진다
        ob.root.rotation.z = ob.tip * (Math.PI / 2.4);
      }
    }

    // 다리
    for (const [lab, b] of this.bridges) {
      const done = this.h.isLabDone(lab);
      if (done && !b.done) { b.planks.visible = true; b.grow = this.ready ? 0 : 1; }
      b.done = done;
      b.marker.visible = !done;
      if (done) {
        b.grow = Math.min(1, b.grow + dt * 2.5);
        b.planks.scale.set(Math.max(0.01, b.grow), 1, 1);
      } else {
        b.glow.material.opacity = 0.2 + 0.2 * Math.sin(t * 3);
        b.gem.rotation.y = t * 1.5;
        b.gem.position.y = 0.9 + Math.sin(t * 2) * 0.1;
      }
    }

    // 물결·용암 반짝임
    for (const hz of this.hazards) {
      if (hz.kind === "^") continue;
      hz.mat.emissiveIntensity = hz.base * (0.8 + 0.25 * Math.sin(t * (hz.kind === "!" ? 3 : 1.5)));
      if (hz.map) {
        hz.map.offset.y = t * (hz.kind === "!" ? 0.05 : 0.18);
        hz.map.offset.x = Math.sin(t * 0.6) * 0.04;
      }
      // 플레이어 근처 용암에서 불티가 솟는다
      if (hz.kind === "!" && Math.abs(hz.cx - g.me.x) < 14 && Math.random() < dt * 14) {
        this.sparks.emit({
          x: hz.cx - 1 + Math.random() * 2, y: 0, z: 1 + Math.random() * (H - 2),
          vx: (Math.random() - 0.5) * 0.3, vy: 0.8 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 0.3,
          life: 1.2 + Math.random(), size: 0.08 + Math.random() * 0.08, color: Math.random() < 0.5 ? 0xffb347 : 0xff5a1f,
        });
      }
    }

    // 사격 탄환: 앞으로 나아가고, 벽에 닿거나 시간이 다 되면 사라진다. 표적에 닿으면 명중!
    for (const b of this.bolts) {
      const P = b.mesh.position;
      P.x += b.vx * dt;
      P.z += b.vz * dt;
      b.ttl -= dt;
      // 빛 꼬리
      this.sparks.emit({ x: P.x, y: P.y, z: P.z, life: 0.2, size: 0.13, color: 0x38e8ff, alpha: 0.7 });
      const ch = g.grid[Math.floor(P.z)]?.[Math.floor(P.x)];
      if (b.ttl <= 0 || ch === undefined || ch === "#" || ch === "o" || ch === "@" || /[123]/.test(ch)) {
        b.dead = true;
        if (b.ttl > 0) {
          // 벽에 맞으면 불꽃이 튄다
          this.sparks.burst(P.x - b.vx * 0.02, P.y, P.z - b.vz * 0.02, { count: 10, speed: 2.5, up: 2, life: 0.35, size: 0.12, color: 0xffd27a });
          this.sparks.emit({ x: P.x, y: P.y, z: P.z, life: 0.12, size: 0.7, color: 0x9ffcff });
        }
        continue;
      }
      for (const tg of this.targets.values()) {
        if (tg.done) continue;
        if (Math.hypot(tg.t.x - P.x, tg.t.y - P.z) < 0.55) {
          b.dead = true;
          this.hitTarget(tg, P);
          break;
        }
      }
    }
    this.bolts = this.bolts.filter((b) => {
      if (!b.dead) return true;
      this.scene.remove(b.mesh);
      b.mesh.material.dispose();
      return false;
    });

    // 표적: 반짝이고, 명중 횟수를 이름표에 새기고, 10발이 되면 깨진다
    for (const tg of this.targets.values()) {
      if (tg.done) continue;
      tg.crystal.rotation.y = t * 1.6;
      tg.crystal.position.y = 1.05 + Math.sin(t * 2.2) * 0.08;
      tg.flash = Math.max(0, tg.flash - dt * 3);
      const s = 1 + tg.flash * 0.6;
      tg.crystal.scale.setScalar(s);
      tg.ring.material.opacity = 0.3 + 0.25 * Math.sin(t * 3) + tg.flash * 0.4;
      tg.halo.material.opacity = 0.45 + 0.15 * Math.sin(t * 4) + tg.flash * 0.6;
      tg.halo.position.y = tg.crystal.position.y;
      tg.crystal.material.emissive.setHex(tg.flash > 0.5 ? 0xffffff : 0xff2fb3);
      if (tg.labelCount !== tg.hits) {
        tg.labelCount = tg.hits;
        this.scene.remove(tg.label);
        disposeLabel(tg.label);
        tg.label = makeBar(tg.hits);
        tg.label.position.set(tg.t.x, 1.75, tg.t.y);
        this.scene.add(tg.label);
      }
    }

    // 제단의 유물
    const relics = this.h.relics();
    this.coinRing.rotation.y = t * 0.5;
    this.coins.forEach((c, i) => {
      c.coin.rotation.y = t * 2 + i;
      if (relics[i] !== c.lit) {
        c.lit = relics[i];
        for (const mat of c.mats) {
          mat.color.set(c.lit ? 0xffffff : 0x555566);
          mat.emissive = new THREE.Color(c.lit ? 0x8a5a00 : 0x000000);
        }
      }
    });

    // 안내 말풍선
    const text = g.focus ? g.promptText(g.focus) : "";
    if (text !== this.promptText) {
      if (this.prompt) { this.scene.remove(this.prompt); disposeLabel(this.prompt); this.prompt = null; }
      if (text) {
        this.prompt = makeLabel(text, { bg: "rgba(17,24,39,0.9)", fg: "#fde68a", size: 34, height: 0.42 });
        this.scene.add(this.prompt);
      }
      this.promptText = text;
    }
    if (this.prompt) this.prompt.position.set(g.focus.x, 2.05 + Math.sin(t * 3) * 0.05, g.focus.y);

    // 제단 위 기하 벡터 홀로그램
    if (this.vectorHolograms) for (const h of this.vectorHolograms) h.rotation.y = t * 0.8;

    this.syncFx(dt, t);

    // 카메라: 약 40° 내려다보는 액션 RPG 시점(얼굴과 지형이 함께 보인다). 진행 방향으로 살짝 앞을 보여 주고, 사격·명중 때 흔들린다.
    const dir = g.me.dir, dl = Math.hypot(dir[0], dir[1]) || 1;
    const leadAmt = g.me.moving ? 1.6 : 0.6;
    this.lead.lerp(new THREE.Vector3((dir[0] / dl) * leadAmt, 0, (dir[1] / dl) * leadAmt * 0.6), 1 - Math.pow(0.05, dt));
    // 화면 가장자리에 지도 바깥(빈 공간)이 보이지 않도록 카메라 중심을 막는다
    const halfW = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 13.5 * this.camera.aspect;
    const lx = Math.min(W - halfW * 0.7, Math.max(halfW * 0.7, g.me.x + this.lead.x));
    const lz = Math.min(H - 4.5, Math.max(4.5, g.me.y + this.lead.z));
    const look = new THREE.Vector3(lx, 0.5 + (g.me.jumpY ?? 0) * 0.25, lz);
    this.camLook.lerp(look, this.ready ? 1 - Math.pow(0.004, dt) : 1);
    this.kick.multiplyScalar(Math.pow(0.0005, dt));
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const sh = this.shake * this.shake * 0.35;
    const jx = (Math.random() - 0.5) * sh, jy = (Math.random() - 0.5) * sh;
    this.camera.position.set(this.camLook.x + jx + this.kick.x, this.camLook.y + 7.4 + jy, this.camLook.z + 8.6 + this.kick.z);
    this.camera.lookAt(this.camLook.x + jx * 0.5, this.camLook.y, this.camLook.z);
    this.sun.position.set(g.me.x - 5, 12, g.me.y + 6);
    this.sun.target.position.set(g.me.x, 0, g.me.y);
    this.rim.position.set(g.me.x + 3, 5, g.me.y - 8);
    this.rim.target.position.set(g.me.x, 0, g.me.y);
    this.fill.position.set(g.me.x, 6, g.me.y + 7);
    this.fill.target.position.set(g.me.x, 1, g.me.y);
    // 서버에서 내 진행 상황을 받은 뒤부터는 상태 변화를 애니메이션으로 보여 준다.
    if (this.h.hasState()) this.ready = true;
  }

  onPointer(e) {
    this.cv.focus();
    const f = this.game.focus;
    if (!f || this.game.h.paused()) return;
    const v = new THREE.Vector3(f.x, 0.6, f.y).project(this.camera);
    const r = this.cv.getBoundingClientRect();
    const sx = ((v.x + 1) / 2) * r.width + r.left, sy = ((1 - v.y) / 2) * r.height + r.top;
    if (Math.hypot(e.clientX - sx, e.clientY - sy) < 110) this.h.onInteract(f);
  }

  // 매 프레임 연출: 횃불, 발걸음 먼지, 착지, 조준 화살표, 떠다니는 티끌, 떠오르는 글자
  syncFx(dt, t) {
    const g = this.game;
    // 횃불 일렁임 + 가까운 횃불에 실제 빛 배치
    for (const tc of this.torches) {
      const f = 0.85 + 0.15 * Math.sin(t * 13 + tc.seed) * Math.sin(t * 7.3 + tc.seed * 2);
      tc.flame.scale.setScalar(0.9 * f);
      tc.core.scale.setScalar(0.35 * (0.9 + 0.1 * Math.sin(t * 21 + tc.seed)));
      tc.d = Math.hypot(tc.pos.x - g.me.x, tc.pos.z - g.me.y);
      if (Math.random() < dt * 3) {
        const p = tc.flame.getWorldPosition(new THREE.Vector3());
        this.sparks.emit({ x: p.x, y: p.y + 0.05, z: p.z, vy: 0.9, vx: (Math.random() - 0.5) * 0.2, life: 0.6, size: 0.06, color: 0xffc070 });
      }
    }
    const near = [...this.torches].sort((a, b) => a.d - b.d);
    this.torchLights.forEach((l, i) => {
      const tc = near[i];
      if (!tc) { l.intensity = 0; return; }
      l.position.copy(tc.pos);
      const fade = Math.max(0, 1 - tc.d / 16);
      l.intensity = 9 * fade * (0.85 + 0.15 * Math.sin(t * 11 + tc.seed));
    });
    this.flashLight.intensity *= Math.pow(0.0001, dt);

    // 발걸음 먼지와 착지 먼지
    const air = !!g.me.air && (g.me.jumpY ?? 0) > 0.02;
    if (g.me.moving && !air) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.14;
        this.dust.emit({ x: g.me.x + (Math.random() - 0.5) * 0.2, y: 0.08 + (g.me.jumpY ?? 0), z: g.me.y + (Math.random() - 0.5) * 0.2,
          vy: 0.35, vx: -g.me.dir[0] * 0.4, vz: -g.me.dir[1] * 0.4, life: 0.55, size: 0.28, grow: 1.2, color: 0xb9ab97, alpha: 0.45, drag: 2 });
      }
    }
    if (this.wasAir && !air) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.dust.emit({ x: g.me.x, y: 0.08 + (g.me.jumpY ?? 0), z: g.me.y, vx: Math.cos(a) * 1.6, vz: Math.sin(a) * 1.6, vy: 0.2,
          life: 0.5, size: 0.3, grow: 1.4, color: 0xc4b8a6, alpha: 0.5, drag: 4 });
      }
      this.shake = Math.min(1, this.shake + 0.08);
    }
    this.wasAir = air;

    // 조준 화살표: 내 앞 바닥에서 숨 쉬듯 빛난다
    const dir = g.me.dir, dl = Math.hypot(dir[0], dir[1]);
    if (dl > 0.01) {
      this.aim.visible = true;
      this.aim.position.set(g.me.x, 0.04 + (g.me.jumpY ?? 0), g.me.y);
      this.aim.rotation.y = Math.atan2(-dir[0] / dl, -dir[1] / dl);
      this.aim.children[0].material.opacity = 0.55 + 0.3 * Math.sin(t * 5);
    } else this.aim.visible = false;

    // 내 캐릭터 링 맥박 + 사격 반동
    for (const av of this.avatars.values()) {
      if (av.ring && av.key === "me") av.ring.scale.setScalar(1 + 0.06 * Math.sin(t * 4));
      if (av.recoil > 0 && av.model) {
        av.recoil = Math.max(0, av.recoil - dt * 8);
        av.model.position.z = -av.recoil * 0.08;
      }
    }

    // 공중을 떠다니는 먼지 티끌 (분위기)
    if (this.quality !== "low" && Math.random() < dt * 10) {
      this.sparks.emit({
        x: g.me.x + (Math.random() - 0.5) * 22, y: 0.3 + Math.random() * 2.5, z: 1 + Math.random() * (H - 2),
        vx: 0.1 + Math.random() * 0.15, vy: 0.05, vz: (Math.random() - 0.5) * 0.1,
        life: 3 + Math.random() * 3, size: 0.05 + Math.random() * 0.05, color: 0xffe2a8, alpha: 0.5,
      });
    }

    this.sparks.update(dt);
    this.dust.update(dt);

    // 떠오르는 글자
    this.popTexts = this.popTexts.filter((p) => {
      p.life -= dt;
      p.label.position.y += p.vy * dt;
      p.vy *= Math.pow(0.1, dt);
      p.label.material.opacity = Math.min(1, p.life / p.max * 2);
      if (p.life > 0) return true;
      this.scene.remove(p.label);
      disposeLabel(p.label);
      return false;
    });
  }

  // 표적 명중 1발: 반짝이고, 10발이면 표적이 깨지며 개념 카드 팝업을 연다
  hitTarget(tg, at) {
    tg.hits++;
    tg.flash = 1;
    const x = at?.x ?? tg.t.x, y = at?.y ?? 1.05, z = at?.z ?? tg.t.y;
    this.sparks.burst(x, y, z, { count: 16, speed: 3, up: 2, life: 0.45, size: 0.14, color: 0xff7ad9 });
    this.sparks.emit({ x, y, z, life: 0.14, size: 1.1, color: 0xffd6f5 });
    this.flashLight.position.set(x, y + 0.3, z);
    this.flashLight.color.set(0xff4fc8);
    this.flashLight.intensity = 14;
    this.shake = Math.min(1, this.shake + 0.22);
    this.popText(tg.hits < 10 ? "HIT!" : "BREAK!", tg.t.x, 2.1, tg.t.y, tg.hits < 10 ? "#ffd6f5" : "#ffe066", tg.hits < 10 ? 0.34 : 0.55);
    if (tg.hits < 10) return;
    tg.done = true;
    tg.crystal.visible = false;
    tg.ring.visible = false;
    tg.halo.visible = false;
    this.scene.remove(tg.label);
    disposeLabel(tg.label);
    // 수정이 산산조각: 큰 폭발 + 강한 흔들림
    this.sparks.burst(tg.t.x, 1.05, tg.t.y, { count: 60, speed: 5, up: 4, life: 0.9, size: 0.2, color: 0xff5fd0 });
    this.sparks.burst(tg.t.x, 1.05, tg.t.y, { count: 30, speed: 3, up: 3, life: 1.1, size: 0.12, color: 0xffe066 });
    this.sparks.emit({ x: tg.t.x, y: 1.05, z: tg.t.y, life: 0.25, size: 3.2, color: 0xffffff });
    this.shake = 1;
    this.h.onTargetHit?.(tg.t);
  }
}
