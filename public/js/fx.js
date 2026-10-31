// 게임 화면의 연출 도구: 파티클(불꽃·먼지·스파크), 빛 번짐 텍스처, 돌·용암·물 텍스처.
// 모두 코드로 그려서 이미지 파일이 따로 없다.
import * as THREE from "three";

// ---------- 빛 번짐(글로우) 스프라이트 텍스처 ----------
const glowCache = new Map();
export function glowTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
  const key = inner + outer;
  if (glowCache.has(key)) return glowCache.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, "0.45)"));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  glowCache.set(key, tex);
  return tex;
}

export function glowSprite(color, size = 1, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  s.scale.setScalar(size);
  return s;
}

// ---------- 파티클 ----------
// 하나의 Points로 수백 개를 한 번에 그린다. 각 입자는 위치·속도·수명·크기·색을 가진다.
const VERT = `
attribute float size;
attribute float alpha;
attribute vec3 tint;
varying float vAlpha;
varying vec3 vTint;
uniform float scale;
void main() {
  vAlpha = alpha;
  vTint = tint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * scale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying float vAlpha;
varying vec3 vTint;
uniform float soft;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, soft, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vTint, a);
}`;

export class Particles {
  constructor(scene, { max = 600, additive = true, soft = 0.0 } = {}) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.tint = new Float32Array(max * 3);
    this.p = Array.from({ length: max }, () => ({ life: 0 }));
    this.next = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("size", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("alpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("tint", new THREE.BufferAttribute(this.tint, 3).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 300 }, soft: { value: soft } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.geo = geo;
    this._c = new THREE.Color();
  }

  // 화면 높이에 맞춰 입자 크기를 맞춘다 (해상도가 달라도 같은 크기로 보이게)
  setViewport(heightPx, fov) {
    this.mat.uniforms.scale.value = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
  }

  // o: { x, y, z, vx, vy, vz, life, size, color, gravity, drag, grow }
  emit(o) {
    const p = this.p[this.next];
    this.next = (this.next + 1) % this.max;
    p.x = o.x; p.y = o.y; p.z = o.z;
    p.vx = o.vx ?? 0; p.vy = o.vy ?? 0; p.vz = o.vz ?? 0;
    p.life = p.max = o.life ?? 0.6;
    p.size = o.size ?? 0.2;
    p.grow = o.grow ?? 0;
    p.gravity = o.gravity ?? 0;
    p.drag = o.drag ?? 0;
    p.a0 = o.alpha ?? 1;
    this._c.set(o.color ?? 0xffffff);
    p.r = this._c.r; p.g = this._c.g; p.b = this._c.b;
  }

  // 한 점에서 사방으로 튀는 스파크
  burst(x, y, z, { count = 14, speed = 3, up = 1.5, life = 0.5, size = 0.14, color = 0xffffff, gravity = 6, spread = 1 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.emit({
        x, y, z,
        vx: Math.cos(a) * s * spread, vz: Math.sin(a) * s * spread, vy: up * (0.3 + Math.random()),
        life: life * (0.6 + Math.random() * 0.6), size: size * (0.6 + Math.random() * 0.8),
        color, gravity, drag: 2.5,
      });
    }
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.p[i];
      if (p.life <= 0) { this.alpha[i] = 0; continue; }
      p.life -= dt;
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k; p.vz *= k; p.vy = p.vy * k - p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.02 && p.gravity > 0) { p.y = 0.02; p.vy *= -0.3; }
      const t = Math.max(0, p.life / p.max);
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.size[i] = p.size * (1 + p.grow * (1 - t));
      this.alpha[i] = p.a0 * Math.min(1, t * 2.2);
      this.tint[i * 3] = p.r; this.tint[i * 3 + 1] = p.g; this.tint[i * 3 + 2] = p.b;
    }
    for (const k of ["position", "size", "alpha", "tint"]) this.geo.attributes[k].needsUpdate = true;
  }
}

// ---------- 코드로 그린 텍스처 ----------
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// 결정적인 난수 (매번 같은 무늬)
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// 돌 벽돌: 발판 옆면
export function brickTexture() {
  return canvasTex(128, 128, (ctx, w, h) => {
    const r = rng(7);
    ctx.fillStyle = "#2a2433";
    ctx.fillRect(0, 0, w, h);
    const rows = 4, bh = h / rows;
    for (let y = 0; y < rows; y++) {
      const off = (y % 2) * 32;
      for (let x = -32; x < w; x += 64) {
        const l = 52 + r() * 16;
        ctx.fillStyle = `hsl(${250 + r() * 30}, ${8 + r() * 8}%, ${l * 0.62}%)`;
        ctx.fillRect(x + off + 3, y * bh + 3, 58, bh - 6);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x + off + 3, y * bh + 3, 58, 3);
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(x + off + 3, y * bh + bh - 7, 58, 4);
        for (let k = 0; k < 5; k++) {
          ctx.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.1})`;
          ctx.fillRect(x + off + 6 + r() * 50, y * bh + 6 + r() * (bh - 14), 3 + r() * 6, 2 + r() * 4);
        }
      }
    }
  });
}

// 발판 윗면: 밝은 판석 + 금빛 테두리
export function slabTexture() {
  return canvasTex(128, 128, (ctx, w, h) => {
    const r = rng(11);
    ctx.fillStyle = "#8d8399";
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 60; k++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${0.04 + r() * 0.06})`;
      ctx.fillRect(r() * w, r() * h, 4 + r() * 18, 3 + r() * 10);
    }
    ctx.strokeStyle = "#e9b949";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  }, false);
}

// 용암: 어두운 바위 틈으로 흐르는 밝은 마그마
export function lavaTexture() {
  return canvasTex(128, 128, (ctx, w, h) => {
    const r = rng(23);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#ff3d00");
    bg.addColorStop(0.5, "#ff7a00");
    bg.addColorStop(1, "#ff2a00");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 26; k++) {
      const x = r() * w, y = r() * h, rad = 6 + r() * 16;
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
        g.addColorStop(0, "rgba(60,10,0,0.95)");
        g.addColorStop(0.7, "rgba(90,20,0,0.6)");
        g.addColorStop(1, "rgba(90,20,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
      }
    }
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(255,${200 + r() * 55},80,${0.4 + r() * 0.5})`;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 1 + r() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// 물: 일렁이는 물빛 무늬
export function waterTexture() {
  return canvasTex(128, 128, (ctx, w, h) => {
    const r = rng(5);
    ctx.fillStyle = "#1769b8";
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = "round";
    for (let k = 0; k < 34; k++) {
      const x = r() * w, y = r() * h, len = 10 + r() * 22;
      ctx.strokeStyle = `rgba(160,225,255,${0.15 + r() * 0.35})`;
      ctx.lineWidth = 1.5 + r() * 2;
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.quadraticCurveTo(x + dx + len / 2, y + dy - 4, x + dx + len, y + dy);
        ctx.stroke();
      }
    }
  });
}

// 바닥에 그리는 진행 방향 화살표 (조준 표시)
export function aimTexture() {
  return canvasTex(64, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) {
      const y = 18 + i * 34;
      ctx.strokeStyle = `rgba(125,252,255,${0.35 + i * 0.3})`;
      ctx.lineWidth = 7;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(10, y + 22);
      ctx.lineTo(32, y);
      ctx.lineTo(54, y + 22);
      ctx.stroke();
    }
  }, false);
}
