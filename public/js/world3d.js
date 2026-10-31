// 유적 3D 화면 (Three.js). 규칙은 game.js가 갖고, 여기서는 그 상태를 그린다.
// 모델: Kenney Mini Dungeon / Mini Characters (CC0). 지도 한 칸 = 3D 공간 1, 지도 (x, y) → (x, 0, y).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { loadCharacter, makeCharacter } from "./characters.js";
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
function makeLabel(text, { bg = "rgba(17,24,39,0.8)", fg = "#fff", size = 30, height = 0.32 } = {}) {
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
  ctx.roundRect(0, 0, c.width, c.height, c.height / 2);
  ctx.fill();
  ctx.fillStyle = fg;
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

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1c1828);
    this.scene.fog = new THREE.Fog(0x1c1828, 16, 32);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xfff4dc, 0x40355a, 1.7));
    this.sun = new THREE.DirectionalLight(0xffffff, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 40 });
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);
    // 뒤쪽에서 비추는 차가운 빛: 캐릭터와 물체 가장자리가 반짝여 입체감이 산다
    this.rim = new THREE.DirectionalLight(0xa8d8ff, 1.3);
    this.scene.add(this.rim, this.rim.target);
    // 정면 보조광(필 라이트): 캐릭터 얼굴이 어둡게 묻히지 않게 카메라 쪽에서 밝혀 준다
    this.fill = new THREE.DirectionalLight(0xfff2dd, 1.25);
    this.scene.add(this.fill, this.fill.target);

    // 진행 방향 120° 탐험 후레시 (SpotLight): 캐릭터 앞길을 120도 원뿔 조명으로 시원하게 비춘다
    this.flashlight = new THREE.SpotLight(0xfff7e6, 3.8, 18, THREE.MathUtils.degToRad(60), 0.35, 1.2);
    this.flashlight.castShadow = true;
    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlight, this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;

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
    // 사격 탄환용 공용 지오메트리·재료 (네온 벡터 탄)
    this.boltGeo = new THREE.SphereGeometry(0.16, 10, 10);
    this.boltMat = new THREE.MeshBasicMaterial({ color: 0x7dfcff });
  }

  start() {
    const clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;
      this.game.update(dt, t * 1000);
      this.sync(dt, t);
      this.renderer.render(this.scene, this.camera);
    });
  }

  // ---------- 고정된 지형 ----------
  buildStatic(m) {
    const grid = this.game.grid;
    const floors = [], floorColors = [], details = [], detailColors = [], walls = [], banners = [];
    const tint = ROOMS.map((r) => new THREE.Color(r.tint));
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
      const mat = new THREE.MeshStandardMaterial({
        color: hz.color, emissive: hz.emissive, emissiveIntensity: br.hazard === "!" ? 1.2 : 0.4,
        roughness: br.hazard === "~" ? 0.15 : 0.9, transparent: hz.opacity < 1, opacity: hz.opacity,
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, H - 2), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(br.cx, hz.y, H / 2);
      plane.receiveShadow = true;
      this.scene.add(plane);
      this.hazards.push({ kind: br.hazard, mat, base: mat.emissiveIntensity });
      if (br.hazard === "^") {
        // 절벽 양쪽 벽면
        for (const side of [-1, 1]) {
          const cliff = new THREE.Mesh(new THREE.PlaneGeometry(H - 2, 0.9), new THREE.MeshStandardMaterial({ color: 0x3a2f45 }));
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
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85 });
    const topMat = new THREE.MeshStandardMaterial({ color: 0xb0906a, roughness: 0.65 });
    for (const [key, ph] of PLATFORMS) {
      const [x, y] = key.split(",").map(Number);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.96, ph, 0.96), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
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
      const label = makeLabel("🎯 0 / 10", { bg: "rgba(87,16,64,0.9)", fg: "#ffd6f5", size: 26, height: 0.3 });
      label.position.set(t.x, 1.9, t.y);
      this.scene.add(label);
      this.targets.set(t.zone, { t, crystal, ring, label, labelCount: 0, hits: 0, done: false, flash: 0 });
    }
  }

  // ---------- 기하 벡터 3D 좌표계 및 네온 벡터 홀로그램 ----------
  buildVectorHolograms() {
    this.vectorHolograms = [];
    const points = [
      { x: 10, y: 1.4, z: 7 },
      { x: 26, y: 1.4, z: 7 },
      { x: 42, y: 1.4, z: 7 },
      { x: 60, y: 1.4, z: 7 },
      { x: ALTAR.x + 0.5, y: 2.3, z: ALTAR.y + 0.5 },
    ];
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

    // 플레이어 발밑 방향 벡터 화살표 (진행 방향 및 크기 실시간 표시)
    this.playerVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0.08, 0),
      1.0,
      0x5eead4,
      0.32,
      0.2
    );
    this.scene.add(this.playerVectorArrow);
  }

  // 사격: 전방(me.dir)으로 네온 벡터 탄환을 하나 쏜다. 명중·소멸은 sync에서 처리한다.
  shoot() {
    const g = this.game;
    const dir = g.me.dir, len = Math.hypot(dir[0], dir[1]) || 1;
    const mesh = new THREE.Mesh(this.boltGeo, this.boltMat.clone());
    mesh.position.set(g.me.x, 0.9, g.me.y);
    this.scene.add(mesh);
    this.bolts.push({ mesh, vx: (dir[0] / len) * BOLT_SPEED, vz: (dir[1] / len) * BOLT_SPEED, ttl: 1.5 });
  }

  // ---------- 캐릭터 ----------
  avatar(key, n, team = null) {
    let av = this.avatars.get(key);
    if (av) return av;
    const group = new THREE.Group();
    group.rotation.y = Math.PI; // 모델은 -z를 보고 있으므로 처음에는 카메라 쪽(+z)을 보게 돌린다
    av = { group, n, team, label: null, labelText: "", model: null, mixer: null, actions: null, current: null };
    this.avatars.set(key, av);
    this.scene.add(group);
    loadCharacter(n).then((gltf) => {
      if (this.avatars.get(key) !== av) return; // 그새 나갔으면 버린다
      const { model, mixer, action } = makeCharacter(gltf, { outline: this.quality !== "low", n, team });
      model.scale.setScalar(1.45);
      group.add(model);
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
      av.label = makeLabel(name, { bg: isMe ? "rgba(15,118,110,0.92)" : "rgba(17,24,39,0.7)" });
      av.label.position.y = 1.55;
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
        if (this.ready) this.cheer();
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
    for (const hz of this.hazards) if (hz.kind !== "^") hz.mat.emissiveIntensity = hz.base * (0.8 + 0.25 * Math.sin(t * (hz.kind === "!" ? 3 : 1.5)));

    // 사격 탄환: 앞으로 나아가고, 벽에 닿거나 시간이 다 되면 사라진다. 표적에 닿으면 명중!
    for (const b of this.bolts) {
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.z += b.vz * dt;
      b.mesh.rotation.y += dt * 8;
      b.ttl -= dt;
      const ch = g.grid[Math.floor(b.mesh.position.z)]?.[Math.floor(b.mesh.position.x)];
      if (b.ttl <= 0 || ch === undefined || ch === "#" || ch === "o" || ch === "@") { b.dead = true; continue; }
      for (const tg of this.targets.values()) {
        if (tg.done) continue;
        if (Math.hypot(tg.t.x - b.mesh.position.x, tg.t.y - b.mesh.position.z) < 0.55) {
          b.dead = true;
          this.hitTarget(tg);
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
      if (tg.labelCount !== tg.hits) {
        tg.labelCount = tg.hits;
        this.scene.remove(tg.label);
        disposeLabel(tg.label);
        tg.label = makeLabel(`🎯 ${tg.hits} / 10`, { bg: "rgba(87,16,64,0.9)", fg: "#ffd6f5", size: 26, height: 0.3 });
        tg.label.position.set(tg.t.x, 1.9, tg.t.y);
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

    // 기하 벡터 홀로그램 회전 및 플레이어 발밑 방향 벡터 업데이트
    if (this.vectorHolograms) {
      for (const h of this.vectorHolograms) h.rotation.y = t * 0.8;
    }
    if (this.playerVectorArrow) {
      const dir = g.me.dir;
      const len = Math.hypot(dir[0], dir[1]);
      this.playerVectorArrow.position.set(g.me.x, 0.08, g.me.y);
      if (len > 0.01) {
        this.playerVectorArrow.setDirection(new THREE.Vector3(dir[0] / len, 0, dir[1] / len));
        this.playerVectorArrow.visible = true;
      } else {
        this.playerVectorArrow.visible = false;
      }
    }

    // 120° 전방 탐험 후레시 및 진행 방향 시야 확장
    const dirX = g.me.dir?.[0] ?? 0, dirZ = g.me.dir?.[1] ?? 1;
    const dLen = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / dLen, nz = dirZ / dLen;
    if (this.flashlight && this.flashlightTarget) {
      this.flashlight.position.set(g.me.x, (g.me.jumpY || 0) + 1.2, g.me.y);
      this.flashlightTarget.position.set(g.me.x + nx * 5.5, 0.4, g.me.y + nz * 5.5);
    }

    // 카메라: 지면 기준 약 30° 사선 쿼터뷰(아이소메트릭)
    // 수직 탑다운(90°)이 아닌 30° 완만한 사선으로 캐릭터의 얼굴, 안경, 모자, 망토가 선명하게 보이며,
    // 진행 방향으로 시야를 1.2칸 살짝 밀어 주어 앞길이 시원하게 보인다
    const halfW = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 12.0 * this.camera.aspect;
    const camX = Math.min(W - halfW, Math.max(Math.min(halfW, W / 2), g.me.x + nx * 1.2));
    const want = new THREE.Vector3(camX, 5.2, g.me.y + 8.6 + nz * 0.8);
    this.camera.position.lerp(want, this.ready ? 1 - Math.pow(0.002, dt) : 1);
    this.camera.lookAt(camX, 1.1, g.me.y + nz * 1.2);
    this.sun.position.set(g.me.x - 5, 12, g.me.y + 6);
    this.sun.target.position.set(g.me.x, 0, g.me.y);
    this.rim.position.set(g.me.x + 3, 5, g.me.y - 8);
    this.rim.target.position.set(g.me.x, 0, g.me.y);
    this.fill.position.set(g.me.x, 4, g.me.y + 7);
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

  // 표적 명중 1발: 반짝이고, 10발이면 표적이 깨지며 개념 카드 팝업을 연다
  hitTarget(tg) {
    tg.hits++;
    tg.flash = 1;
    if (tg.hits < 10) return;
    tg.done = true;
    tg.crystal.visible = false;
    tg.ring.visible = false;
    this.scene.remove(tg.label);
    disposeLabel(tg.label);
    this.h.onTargetHit?.(tg.t);
  }
}
