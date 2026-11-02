// 배경 음악과 효과음을 Web Audio로 직접 만든다. 소리 파일이 없어 저작권·다운로드 걱정이 없다.
// 브라우저는 사용자가 누르기 전에는 소리를 못 내므로, 첫 화면의 TOUCH TO START를 누를 때 start()를 부른다.
// 배경음·효과음 켜기/끄기는 settings.js(메뉴의 '설정')를 따른다.
import { settings, updateSettings, onSettings } from "./settings.js";

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// 기승전결: 방이 바뀔 때마다 다음 장으로 넘어간다. 탈출하면 '맺음' 장이 흐른다.
// 각 장은 16마디이며 [본 구간 8마디 → 변주 4마디 → 쉼 2마디 → 고조 2마디]로 돌아 단조롭지 않다.
const N = null;
const CHAPTERS = [
  { name: "기", bpm: 92, // 도입: 조용하고 신비롭게, 유적에 들어선다
    chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], roots: [45, 41, 43, 40],
    lead: [[76, N, N, N, 74, N, 72, N, 71, N, N, N, N, N, N, N], [72, N, N, N, 69, N, 67, N, 65, N, N, N, N, N, N, N],
      [71, N, N, N, 72, N, 74, N, 67, N, N, N, N, N, N, N], [68, N, N, N, 71, N, N, N, 64, N, N, N, N, N, N, N]],
    kick: [0], snare: [], hat: 4, bass: 8, arp: 2, pad: 0.05 },
  { name: "승", bpm: 112, // 전개: 발걸음이 빨라진다
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], roots: [45, 41, 36, 43],
    lead: [[69, N, 72, N, 76, N, 74, 72, 71, N, 72, N, 69, N, N, N], [65, N, 69, N, 72, N, 74, 72, 69, N, 67, N, 65, N, N, N],
      [64, N, 67, N, 72, N, 71, 72, 74, N, 76, N, 72, N, N, N], [71, N, 74, N, 79, N, 77, 76, 74, N, 71, N, 74, N, 76, N]],
    kick: [0, 8], snare: [4, 12], hat: 2, bass: 2, arp: 1, pad: 0.03 },
  { name: "전", bpm: 128, // 긴장: 단조가 짙어지고 엇박이 생긴다
    chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [52, 56, 59]], roots: [38, 34, 36, 40],
    lead: [[74, N, 77, 74, 81, N, 79, 77, 76, N, 74, N, 72, 74, N, N], [74, N, 70, N, 77, N, 74, N, 70, 72, 74, N, 77, N, N, N],
      [76, N, 79, 76, 84, N, 83, 81, 79, N, 76, N, 72, N, 76, N], [80, N, 76, N, 83, N, 80, N, 76, N, 74, N, 71, N, 68, N]],
    kick: [0, 3, 8, 11], snare: [4, 12], hat: 1, bass: 1, arp: 1, pad: 0.035 },
  { name: "결", bpm: 136, // 해결: 장조로 밝게 풀리며 제단에 다가간다
    chords: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], roots: [36, 43, 45, 41],
    lead: [[72, N, 76, N, 79, N, 84, N, 83, N, 79, N, 76, N, N, N], [74, N, 79, N, 83, N, 86, 84, 83, N, 79, N, 74, N, N, N],
      [76, N, 81, N, 84, N, 83, 81, 79, N, 76, N, 72, N, N, N], [77, N, 81, N, 84, N, 86, N, 88, N, 86, N, 84, N, N, N]],
    kick: [0, 8, 14], snare: [4, 12], hat: 1, bass: 2, arp: 1, pad: 0.03, crash: true },
  { name: "맺음", bpm: 84, // 탈출 후: 느리고 따뜻하게 마무리
    chords: [[48, 52, 55, 59], [53, 57, 60, 64], [45, 48, 52, 55], [55, 59, 62, 65]], roots: [36, 41, 33, 43],
    lead: [[79, N, N, N, 76, N, N, N, 72, N, N, N, N, N, N, N], [77, N, N, N, 76, N, N, N, 72, N, N, N, N, N, N, N],
      [76, N, N, N, 72, N, N, N, 69, N, N, N, N, N, N, N], [74, N, N, N, 71, N, 74, N, 72, N, N, N, N, N, N, N]],
    kick: [], snare: [], hat: 0, bass: 8, arp: 2, pad: 0.06 },
];
const BARS = 16; // 한 장의 길이(마디)

// 예전 배경음악: 첫 화면과 대기 시간에 흐른다. 탐험이 시작되면 기승전결 음악으로 넘어간다.
// 진행 Am – F – C – G (한 마디씩, 4마디 반복)
const CLASSIC = {
  bpm: 136,
  chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
  roots: [45, 41, 36, 43],
  lead: [
    [69, N, 72, N, 76, N, 74, 72, 71, N, 72, N, 69, N, N, N],
    [65, N, 69, N, 72, N, 74, 72, 69, N, 67, N, 65, N, N, N],
    [64, N, 67, N, 72, N, 71, 72, 74, N, 76, N, 72, N, N, N],
    [71, N, 74, N, 79, N, 77, 76, 74, N, 71, N, 74, N, 76, N],
  ],
};
const SWITCH_FADE = 0.6; // 음악을 바꿀 때 줄였다 키우는 시간(초)
const MUSIC_VOL = 0.3, DUCK_VOL = 0.1, MASTER_VOL = 0.6;

class Sound {
  constructor() {
    this.ctx = null;
    this.ducked = false;
    this.intensity = 0; // 0~4: 기·승·전·결·맺음 중 지금 장
    this.track = "classic"; // "classic"(예전 음악: 첫 화면·대기) → "story"(기승전결: 탐험 중)
    this.nextTrack = null;
    this.fading = false;
    onSettings(() => this.applyVolumes());
  }

  get muted() { return !settings.music && !settings.sfx; }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    this.master = this.gain(MASTER_VOL, comp);
    this.music = this.gain(0, this.master);
    this.fx = this.gain(0, this.master);
    this.applyVolumes();
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    if (this.nextTrack) { this.track = this.nextTrack; this.nextTrack = null; } // 소리를 켜기 전에 정해졌으면 바로 그 음악으로
    this.step = 0;
    this.next = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  // ---------- 설정 ----------
  applyVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(settings.music && !this.fading ? (this.ducked ? DUCK_VOL : MUSIC_VOL) : 0, now, 0.1);
    this.fx.gain.setTargetAtTime(settings.sfx ? 0.75 : 0, now, 0.05);
  }
  // 🔊 버튼·M 키: 하나라도 켜져 있으면 모두 끄고, 모두 꺼져 있으면 모두 켠다.
  toggle() { const on = this.muted; updateSettings({ music: on, sfx: on }); }
  onChange(f) { onSettings(() => f(this.muted)); }
  setIntensity(level) { if (!this.ended) this.intensity = Math.max(0, Math.min(3, level)); }
  ending() { this.ended = true; this.intensity = 4; this.setTrack("story"); } // 탈출한 뒤의 맺음 음악 (방을 옮겨도 그대로)
  setDuck(on) { this.ducked = on; this.applyVolumes(); }
  // 배경음악 바꾸기: 소리를 잠깐 줄였다가 다음 마디 첫머리에서 새 음악으로 넘어간다
  setTrack(name) {
    if (name !== "classic" && name !== "story") return;
    if ((this.nextTrack ?? this.track) === name) return;
    this.nextTrack = name;
    if (!this.ctx) return;
    this.fading = true;
    this.applyVolumes();
  }

  // ---------- 기본 부품 ----------
  gain(v, to) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    if (to) g.connect(to);
    return g;
  }

  env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  osc(type, freq, t, dur, out, { peak = 0.3, attack = 0.005, slide, filter, q = 1, detune = 0 } = {}) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    o.detune.value = detune;
    const g = this.gain(0, out);
    let node = o;
    if (filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filter;
      f.Q.value = q;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    this.env(g, t, peak, attack, dur);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
  }

  noise(t, dur, out, { type = "highpass", freq = 1000, peak = 0.3, sweep, q = 1 } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true; // 1초보다 긴 소리(고조 구간)도 끊기지 않게
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    f.Q.value = q;
    const g = this.gain(0, out);
    src.connect(f).connect(g);
    this.env(g, t, peak, 0.003, dur);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // ---------- 배경 음악 ----------
  schedule() {
    if (!settings.music) { this.next = this.ctx.currentTime + 0.1; return; } // 꺼져 있으면 쉬었다가 다시 켤 때 이어서
    while (this.next < this.ctx.currentTime + 0.12) {
      if (this.nextTrack && this.step % 16 === 0) {
        this.fadeAt ??= this.ctx.currentTime + SWITCH_FADE; // 먼저 소리가 줄어든 뒤, 마디 첫머리에서 바꾼다
        if (this.next >= this.fadeAt) {
          this.track = this.nextTrack;
          this.nextTrack = null;
          this.fadeAt = undefined;
          this.step = 0;
          this.chapter = undefined;
          this.cycle = 0;
          this.fading = false;
          this.music.gain.setTargetAtTime(settings.music ? (this.ducked ? DUCK_VOL : MUSIC_VOL) : 0, this.next, 0.25);
        }
      }
      if (this.track === "classic") {
        this.playClassic(this.step % 64, this.next);
        this.next += 60 / CLASSIC.bpm / 4;
        this.step = (this.step + 1) % 64;
        continue;
      }
      // 장이 바뀌면 마디 첫머리에서 넘어가 박이 어긋나지 않게 한다
      if (this.step % 16 === 0 && this.chapter !== this.intensity) {
        if (this.chapter !== undefined) this.step = 0;
        this.chapter = this.intensity;
        this.cycle = 0;
      }
      const ch = CHAPTERS[this.chapter ?? 0];
      this.playStep(this.step, this.next, ch);
      this.next += 60 / ch.bpm / 4; // 16분음표, 장마다 빠르기가 다르다
      this.step = (this.step + 1) % (BARS * 16);
      if (this.step === 0) this.cycle = (this.cycle ?? 0) + 1; // 한 장을 한 바퀴 돌 때마다 조금씩 바꾼다
    }
  }

  // 예전 음악: 방이 바뀔수록 악기가 늘어나던 반복곡 (대기 중에는 intensity 0)
  playClassic(s, t) {
    const C = CLASSIC, step = 60 / C.bpm / 4;
    const bar = Math.floor(s / 16), i = s % 16, lvl = this.intensity, out = this.music;
    if (i % 8 === 0 || (lvl >= 1 && (i === 11 || i === 14))) this.osc("sine", 150, t, 0.25, out, { peak: 0.9, slide: 42 });
    if (i === 4 || i === 12) {
      this.noise(t, 0.14, out, { freq: 1300, peak: 0.35 });
      this.osc("triangle", 190, t, 0.08, out, { peak: 0.2 });
    }
    if (i % 2 === 0 || lvl >= 1) this.noise(t, 0.035, out, { freq: 7500, peak: i % 4 === 2 ? 0.16 : 0.08 });
    if (i % 2 === 0) this.osc("sawtooth", midi(C.roots[bar] + (i % 4 === 2 ? 12 : 0)), t, step * 1.6, out, { peak: 0.22, filter: 520, q: 6 });
    const ch = C.chords[bar];
    this.osc("square", midi(ch[i % 3] + 12 * (Math.floor(i / 3) % 2)), t, 0.11, out, { peak: lvl >= 1 ? 0.07 : 0.045, filter: 2400 });
    if (lvl >= 2 && C.lead[bar][i] !== null) {
      for (const d of [-7, 7]) this.osc("sawtooth", midi(C.lead[bar][i]), t, step * 2.6, out, { peak: 0.06, attack: 0.01, filter: 3200, detune: d });
    }
    if (bar === 3 && i >= 12) this.osc("sine", 140 - (i - 12) * 18, t, 0.18, out, { peak: 0.5, slide: 70 });
    if (lvl >= 3 && i === 0) this.noise(t, 1.1, out, { freq: 5000, peak: 0.12 });
  }

  playStep(s, t, C) {
    const bar = Math.floor(s / 16), i = s % 16, out = this.music, step = 60 / C.bpm / 4;
    const k = bar % 4;
    // 같은 장을 다시 돌 때의 변주: 조 옮김, 멜로디 메아리, 아르페지오 방향, 북 무늬가 바퀴마다 달라진다
    const cyc = this.cycle ?? 0;
    const shift = [0, 2, -2, 3][cyc % 4]; // 반음 단위 조 옮김
    const echo = cyc % 2 === 1; // 홀수 바퀴: 멜로디가 한 번 더 메아리친다
    const arpDown = cyc % 3 === 2; // 세 바퀴마다 아르페지오가 내려온다
    const extraKick = cyc % 4 === 3 && C.kick.length ? [6, 14] : [];
    const tr = (n) => n + shift;
    const part = bar < 8 ? "main" : bar < 12 ? "vary" : bar < 14 ? "rest" : "build";
    const chord = C.chords[k].map(tr), root = tr(C.roots[k]);
    // 바탕 화음(패드): 마디 첫머리에 길게 깔아 공간감을 준다
    if (i === 0) for (const n of chord) this.osc("triangle", midi(n), t, step * 15, out, { peak: C.pad * (part === "rest" ? 1.6 : 1), attack: step * 3, filter: 1400 });
    if (part === "rest") { // 쉼: 북·베이스를 빼고 숨을 고른다
      if (i === 0 || i === 8) this.osc("sine", midi(chord[2] + 24), t, step * 6, out, { peak: 0.035, attack: 0.02 });
      return;
    }
    const build = part === "build", vary = part === "vary";
    // 북
    if (C.kick.includes(i) || extraKick.includes(i) || (build && bar === 15 && i % 2 === 0)) this.osc("sine", 150, t, 0.25, out, { peak: 0.85, slide: 42 });
    if (C.snare.includes(i) || (build && bar === 15 && i >= 8)) {
      this.noise(t, 0.14, out, { freq: 1300, peak: build ? 0.18 + (i / 16) * 0.2 : 0.32 });
      this.osc("triangle", 190, t, 0.08, out, { peak: 0.18 });
    }
    if (C.hat && i % C.hat === 0) this.noise(t, 0.035, out, { freq: 7500, peak: i % 4 === 2 ? 0.14 : 0.07 });
    // 베이스
    if (i % C.bass === 0) this.osc("sawtooth", midi(root + (vary && i % 4 === 2 ? 12 : 0)), t, step * Math.min(C.bass, 4) * 0.9, out, { peak: 0.2, filter: 520, q: 6 });
    // 아르페지오: 변주 구간에서는 거꾸로 내려온다
    if (i % C.arp === 0) {
      const j = vary !== arpDown ? 2 - (i % 3) : i % 3;
      this.osc("square", midi(chord[j] + 12 * (Math.floor(i / 3) % 2)), t, 0.11, out, { peak: 0.045, filter: 2400 });
    }
    // 멜로디: 본 구간 뒤쪽 4마디와 변주 구간(한 옥타브 위)에서만 나온다
    const note = C.lead[k][i];
    if (note !== null && (bar >= 4 || this.chapter >= 3) && !build) {
      const n = tr(note) + (vary ? 12 : 0);
      for (const d of [-7, 7]) this.osc("sawtooth", midi(n), t, step * 2.6, out, { peak: vary ? 0.04 : 0.055, attack: 0.01, filter: 3200, detune: d });
      if (echo) this.osc("triangle", midi(n + 12), t + step * 3, step * 2, out, { peak: 0.025, attack: 0.01, filter: 4000 });
    }
    // 고조: 올라가는 바람 소리
    if (build && i === 0 && bar === 14) this.noise(t, step * 32, out, { type: "bandpass", freq: 300, sweep: 6000, peak: 0.12, q: 1.5 });
    // 결: 장 첫 마디마다 심벌
    if (C.crash && i === 0 && bar % 4 === 0) this.noise(t, 1.1, out, { freq: 5000, peak: 0.1 });
  }

  // ---------- 효과음 ----------
  sfx(name) {
    if (!this.ctx || !settings.sfx) return;
    const t = this.ctx.currentTime + 0.01, out = this.fx;
    const notes = (list, gap, type, dur, peak) => list.forEach((n, k) => this.osc(type, midi(n), t + k * gap, dur, out, { peak }));
    switch (name) {
      case "open": // 휙 열리고 반짝
        this.noise(t, 0.28, out, { type: "bandpass", freq: 400, sweep: 3500, peak: 0.3, q: 2 });
        notes([76, 81, 88], 0.07, "triangle", 0.3, 0.18);
        break;
      case "correct":
        notes([72, 76, 79, 84], 0.075, "square", 0.16, 0.14);
        this.osc("triangle", midi(96), t + 0.3, 0.6, out, { peak: 0.12 });
        break;
      case "wrong":
        this.osc("sawtooth", 220, t, 0.18, out, { peak: 0.2, slide: 180, filter: 900 });
        this.osc("sawtooth", 165, t + 0.2, 0.3, out, { peak: 0.2, slide: 110, filter: 900 });
        break;
      case "door": // 돌문이 끌리며 열린다
        this.noise(t, 1.3, out, { type: "lowpass", freq: 260, peak: 0.6 });
        this.osc("sine", 70, t, 1.2, out, { peak: 0.35, slide: 45 });
        this.osc("square", 110, t + 1.25, 0.15, out, { peak: 0.15, filter: 600 });
        notes([60, 67, 72], 0.12, "triangle", 0.4, 0.12);
        break;
      case "bridge": // 나무판이 탁탁 놓인다
        for (let k = 0; k < 4; k++) {
          this.osc("sine", 190, t + k * 0.11, 0.12, out, { peak: 0.4, slide: 90 });
          this.noise(t + k * 0.11, 0.05, out, { type: "bandpass", freq: 900, peak: 0.25, q: 3 });
        }
        notes([79, 84], 0.09, "triangle", 0.35, 0.12);
        break;
      case "relic": // 팡파르
        for (const n of [60, 64, 67, 72]) this.osc("sawtooth", midi(n), t, 0.9, out, { peak: 0.08, attack: 0.04, filter: 2600 });
        notes([84, 88, 91, 96], 0.08, "triangle", 0.5, 0.1);
        break;
      case "type": // 타자기 소리: 짧은 딸깍 소리, 매번 조금씩 다르게
        this.noise(t, 0.025, out, { type: "bandpass", freq: 2400 + Math.random() * 1600, peak: 0.22, q: 4 });
        this.osc("square", 900 + Math.random() * 300, t, 0.012, out, { peak: 0.04, filter: 3000 });
        break;
      case "found": // 다른 친구가 유물 조각을 발견
        notes([79, 84, 88], 0.06, "triangle", 0.25, 0.08);
        break;
      case "shoot": // 네온 벡터 탄환 발사: 촤악 레이저 소리
        this.osc("sawtooth", 880, t, 0.12, out, { peak: 0.14, slide: 1760, filter: 3200 });
        this.noise(t, 0.06, out, { type: "bandpass", freq: 3200, peak: 0.12, q: 3 });
        break;
      case "hit": // 표적 명중: 맑은 금속성 소리
        notes([88, 93], 0.05, "triangle", 0.18, 0.12);
        break;
      case "target": // 표적 10발 완성: 팡파레
        notes([72, 76, 79, 84, 88], 0.08, "square", 0.3, 0.12);
        break;
      case "start": // 탐험 시작 신호
        notes([60, 67, 72], 0.14, "sawtooth", 0.25, 0.1);
        for (const n of [60, 64, 67, 72]) this.osc("sawtooth", midi(n), t + 0.45, 0.8, out, { peak: 0.07, attack: 0.03, filter: 2800 });
        this.osc("sine", 150, t + 0.45, 0.4, out, { peak: 0.8, slide: 40 });
        break;
    }
  }
}

export const sound = new Sound();
