// 첫 화면 연출: 쏟아지는 기하 기호(매트릭스), 유적 바닥 위를 달리는 3D 탐험가들, 메뉴 카드의 캐릭터 그림.
// 게임에 들어가면 pause()로 멈춰 크롬북 자원을 아낀다.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { loadCharacter, makeCharacter } from "./characters.js";
import { settings } from "./settings.js";

const GLYPHS = [..."→←↗abABCDOPQ∠πθλ√∥⊥△□ΣΔ0123456789+−=·xyk"];

// ---------- 매트릭스처럼 쏟아지는 기하 기호 ----------
function mathRain(canvas) {
  const ctx = canvas.getContext("2d");
  const slow = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cols = [], size = 18, raf = 0, last = 0;
  const resize = () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    size = canvas.width < 600 ? 16 : 20;
    cols = Array.from({ length: Math.ceil(canvas.width / size) }, () => Math.random() * canvas.height / size);
    ctx.fillStyle = "#0b0a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (now - last < (slow ? 140 : 45)) return;
    last = now;
    ctx.fillStyle = "rgba(11, 10, 26, 0.06)"; // 이전 글자를 천천히 지워 잔상을 남긴다
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${size}px "Times New Roman", serif`;
    cols.forEach((y, i) => {
      const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      const x = i * size, py = y * size;
      ctx.fillStyle = Math.random() < 0.08 ? "#fde68a" : "#5eead4"; // 가끔 금빛 기호
      ctx.shadowColor = "#2dd4bf";
      ctx.shadowBlur = 8;
      ctx.fillText(ch, x, py);
      ctx.shadowBlur = 0;
      cols[i] = py > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
    });
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
  return {
    play() { if (!raf) raf = requestAnimationFrame(frame); },
    pause() { cancelAnimationFrame(raf); raf = 0; },
  };
}

// ---------- 유적 바닥 위를 달리는 탐험가들 ----------
function runners(canvas) {
  const low = settings.quality === "low";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: true });
  renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = !low;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(-1.2, 2.6, 10.5);
  camera.lookAt(1.2, 1.1, 0);
  scene.add(new THREE.HemisphereLight(0xfff4dc, 0x30264a, 1.8));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-3, 6, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  const rim = new THREE.DirectionalLight(0x8be9ff, 1.6);
  rim.position.set(4, 3, -6);
  scene.add(sun, rim);

  const ground = new THREE.Group();
  scene.add(ground);
  const mixers = [];
  const relic = new THREE.Group();
  relic.position.set(4.2, 3.3, -2);
  scene.add(relic);
  const glow = new THREE.PointLight(0xffc94d, 6, 6);
  relic.add(glow);

  const loader = new GLTFLoader();
  Promise.all([loader.loadAsync("/models/dungeon/floor.glb"), loader.loadAsync("/models/dungeon/column.glb")]).then(([floor, column]) => {
    // 모래빛 바닥 타일을 넓게 깔고 뒤쪽에 기둥을 세운 뒤, 함께 뒤로 흘러가게 해서 달리는 느낌을 낸다
    const sand = new THREE.Color(0xf0dcb4);
    for (let x = -10; x <= 10; x++) for (let z = -4; z <= 2; z++) {
      const t = floor.scene.clone(true);
      t.position.set(x, 0, z);
      t.traverse((o) => {
        if (!o.isMesh) return;
        o.receiveShadow = true;
        o.material = o.material.clone();
        o.material.color.copy(sand);
      });
      ground.add(t);
    }
    for (let x = -10; x <= 10; x += 3) {
      const c = column.scene.clone(true);
      c.position.set(x, 0, -3.6);
      c.scale.set(1.4, 2.2, 1.4);
      c.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      ground.add(c);
    }
  });
  Promise.all([loader.loadAsync("/models/dungeon/coin.glb"), loader.loadAsync("/models/dungeon/key.glb")]).then(([coin, key]) => {
    for (let i = 0; i < 6; i++) {
      const c = coin.scene.clone(true);
      const a = (i / 6) * Math.PI * 2;
      c.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0);
      c.scale.setScalar(0.8);
      relic.add(c);
    }
    const k = key.scene.clone(true);
    k.scale.setScalar(1.5);
    k.position.y = -0.25;
    relic.add(k);
  });

  // 다섯 명이 대각선으로 늘어서 달린다
  const SPOTS = [[-2.6, -1.4], [-1.4, -0.6], [-0.2, 0.1], [1.0, 0.7], [2.2, 1.3]];
  SPOTS.forEach(([x, z], i) => {
    loadCharacter(i * 2 + (i % 2)).then((gltf) => {
      const { model, mixer, action } = makeCharacter(gltf, { outline: !low });
      model.scale.setScalar(1.45);
      model.position.set(x, 0, z);
      model.rotation.y = -Math.PI / 2 + 0.35; // 화면 오른쪽(+x)으로 달린다
      scene.add(model);
      const run = action("sprint");
      run.time = i * 0.13;
      run.play();
      mixers.push(mixer);
    });
  });

  // 3차원 기하 벡터 좌표계 및 벡터 합성 홀로그램
  const vectorGroup = new THREE.Group();
  vectorGroup.position.set(-1.8, 2.8, -1.5);
  scene.add(vectorGroup);
  const xArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.5, 0xef4444, 0.35, 0.2);
  const yArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.5, 0x22c55e, 0.35, 0.2);
  const zArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 1.5, 0x3b82f6, 0.35, 0.2);
  const vecA = new THREE.ArrowHelper(new THREE.Vector3(0.8, 0, 0.5).normalize(), new THREE.Vector3(0, 0, 0), 1.2, 0x5eead4, 0.3, 0.16);
  const vecSum = new THREE.ArrowHelper(new THREE.Vector3(0.8, 0.8, 0.5).normalize(), new THREE.Vector3(0, 0, 0), 1.8, 0xfde68a, 0.4, 0.22);
  vectorGroup.add(xArrow, yArrow, zArrow, vecA, vecSum);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const clock = new THREE.Clock();
  let running = false;
  const tick = () => {
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
    for (const m of mixers) m.update(dt);
    ground.position.x = -((t * 3.2) % 3); // 바닥과 기둥이 뒤로 흐른다(기둥 간격 3칸마다 되풀이)
    vectorGroup.rotation.y = t * 0.5;
    vectorGroup.rotation.x = Math.sin(t * 0.6) * 0.15;
    relic.rotation.z = t * 0.6;
    relic.position.y = 2.4 + Math.sin(t * 1.8) * 0.12;
    relic.children.forEach((c, i) => { if (i > 0) c.rotation.y = t * 2 + i; });
    renderer.render(scene, camera);
  };
  return {
    play() { if (!running) { running = true; clock.getDelta(); renderer.setAnimationLoop(tick); } },
    pause() { running = false; renderer.setAnimationLoop(null); },
  };
}

// ---------- 메뉴 카드에 넣을 캐릭터 그림 (한 번 그려 이미지로) ----------
async function portrait(chars, { size = 320, bg = null } = {}) {
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size, false);
  const scene = new THREE.Scene();
  if (bg) scene.background = new THREE.Color(bg);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404060, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(2, 4, 5);
  const rim = new THREE.DirectionalLight(0x9fe7ff, 2.2);
  rim.position.set(-3, 3, -4);
  scene.add(key, rim);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 1.25, 5);
  camera.lookAt(0, 0.85, 0);
  for (const [n, x, z, pose] of chars) {
    const gltf = await loadCharacter(n);
    const { model, mixer, action } = makeCharacter(gltf);
    model.scale.setScalar(1.6);
    model.position.set(x, 0, z);
    model.rotation.y = x * -0.35; // 가운데를 보게 살짝 돌린다
    scene.add(model);
    const a = action(pose);
    a.play();
    mixer.update(0.35);
  }
  renderer.render(scene, camera);
  const url = canvas.toDataURL("image/png");
  renderer.dispose();
  return url;
}

export function createIntro({ rain, stage }) {
  const r = mathRain(rain);
  let run = null;
  try { run = runners(stage); } catch { stage.hidden = true; } // 3D가 안 되는 기기에서는 기호 배경만
  return {
    play() { r.play(); run?.play(); },
    pause() { r.pause(); run?.pause(); },
    showRunners(on) { stage.hidden = !on; if (on) run?.play(); else run?.pause(); },
    // 연습 모드: 혼자 손을 흔드는 탐험가 / 수업 참가: 셋이 함께
    async cardArt() {
      try {
        return {
          practice: await portrait([[0, 0, 0, "emote-yes"]]),
          class: await portrait([[1, -0.75, -0.3, "idle"], [4, 0.75, -0.3, "idle"], [2, 0, 0.3, "emote-yes"]]),
        };
      } catch {
        return null;
      }
    },
  };
}
