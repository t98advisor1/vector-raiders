// 배경 음악과 효과음을 Web Audio로 직접 만든다. 소리 파일이 없어 저작권·다운로드 걱정이 없다.
// 브라우저는 사용자가 누르기 전에는 소리를 못 내므로, 첫 화면의 TOUCH TO START를 누를 때 start()를 부른다.
// 배경음·효과음 켜기/끄기는 settings.js(메뉴의 '설정')를 따른다.
import { settings, updateSettings, onSettings } from "./settings.js";

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

const BPM = 136;
const STEP = 60 / BPM / 4; // 16분음표
// 진행 Am – F – C – G (한 마디씩, 4마디 반복)
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const ROOTS = [45, 41, 36, 43];
const LEAD = [
  [69, null, 72, null, 76, null, 74, 72, 71, null, 72, null, 69, null, null, null],
  [65, null, 69, null, 72, null, 74, 72, 69, null, 67, null, 65, null, null, null],
  [64, null, 67, null, 72, null, 71, 72, 74, null, 76, null, 72, null, null, null],
  [71, null, 74, null, 79, null, 77, 76, 74, null, 71, null, 74, null, 76, null],
];
const MUSIC_VOL = 0.3, DUCK_VOL = 0.1, MASTER_VOL = 0.6;

class Sound {
  constructor() {
    this.ctx = null;
    this.ducked = false;
    this.intensity = 0; // 0~3: 방이 바뀔수록 악기가 늘어난다
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
    this.step = 0;
    this.next = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  // ---------- 설정 ----------
  applyVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(settings.music ? (this.ducked ? DUCK_VOL : MUSIC_VOL) : 0, now, 0.1);
    this.fx.gain.setTargetAtTime(settings.sfx ? 0.75 : 0, now, 0.05);
  }
  // 🔊 버튼·M 키: 하나라도 켜져 있으면 모두 끄고, 모두 꺼져 있으면 모두 켠다.
  toggle() { const on = this.muted; updateSettings({ music: on, sfx: on }); }
  onChange(f) { onSettings(() => f(this.muted)); }
  setIntensity(level) { this.intensity = Math.max(0, Math.min(3, level)); }
  setDuck(on) { this.ducked = on; this.applyVolumes(); }

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
      this.playStep(this.step, this.next);
      this.next += STEP;
      this.step = (this.step + 1) % 64;
    }
  }

  playStep(s, t) {
    const bar = Math.floor(s / 16), i = s % 16, lvl = this.intensity, out = this.music;
    // 북
    if (i % 8 === 0 || (lvl >= 1 && (i === 11 || i === 14))) this.osc("sine", 150, t, 0.25, out, { peak: 0.9, slide: 42 });
    if (i === 4 || i === 12) {
      this.noise(t, 0.14, out, { freq: 1300, peak: 0.35 });
      this.osc("triangle", 190, t, 0.08, out, { peak: 0.2 });
    }
    if (i % 2 === 0 || lvl >= 1) this.noise(t, 0.035, out, { freq: 7500, peak: i % 4 === 2 ? 0.16 : 0.08 });
    // 베이스: 8분음표로 밀어붙이기
    if (i % 2 === 0) this.osc("sawtooth", midi(ROOTS[bar] + (i % 4 === 2 ? 12 : 0)), t, STEP * 1.6, out, { peak: 0.22, filter: 520, q: 6 });
    // 아르페지오
    const ch = CHORDS[bar];
    this.osc("square", midi(ch[i % 3] + 12 * (Math.floor(i / 3) % 2)), t, 0.11, out, { peak: lvl >= 1 ? 0.07 : 0.045, filter: 2400 });
    // 멜로디 (세 번째 방부터)
    if (lvl >= 2 && LEAD[bar][i] !== null) {
      for (const d of [-7, 7]) this.osc("sawtooth", midi(LEAD[bar][i]), t, STEP * 2.6, out, { peak: 0.06, attack: 0.01, filter: 3200, detune: d });
    }
    // 4마디 끝마다 북 채우기
    if (bar === 3 && i >= 12) this.osc("sine", 140 - (i - 12) * 18, t, 0.18, out, { peak: 0.5, slide: 70 });
    // 제단: 마디 첫 박에 심벌
    if (lvl >= 3 && i === 0) this.noise(t, 1.1, out, { freq: 5000, peak: 0.12 });
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
      case "start": // 탐험 시작 신호
        notes([60, 67, 72], 0.14, "sawtooth", 0.25, 0.1);
        for (const n of [60, 64, 67, 72]) this.osc("sawtooth", midi(n), t + 0.45, 0.8, out, { peak: 0.07, attack: 0.03, filter: 2800 });
        this.osc("sine", 150, t + 0.45, 0.4, out, { peak: 0.8, slide: 40 });
        break;
    }
  }
}

export const sound = new Sound();
