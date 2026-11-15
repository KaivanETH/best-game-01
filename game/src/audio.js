// Sound: every effect is synthesized with WebAudio, so the game ships no audio files.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let noiseBuffer = null;

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < data.length; i++) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      data[i] = (s / 4294967296) * 2 - 1;
    }
  }

  function tone(freq, dur, { type = 'sine', vol = 0.25, slide = 0, delay = 0 } = {}) {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, { vol = 0.3, freq = 800, delay = 0 } = {}) {
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(120, t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319];
  const sounds = {
    click: () => tone(660, 0.08, { type: 'triangle', vol: 0.15 }),
    catch: () => tone(1240, 0.12, { vol: 0.06 }),
    spawn: () => tone(392, 0.5, { type: 'triangle', vol: 0.05 }),
    dock: (combo = 1) => {
      const base = Math.min(combo - 1, SCALE.length - 3);
      tone(SCALE[Math.max(0, base)], 0.25, { type: 'triangle', vol: 0.2 });
      tone(SCALE[Math.max(0, base) + 2], 0.35, { type: 'triangle', vol: 0.18, delay: 0.08 });
    },
    wrongDock: () => tone(440, 0.25, { type: 'triangle', vol: 0.15 }),
    crash: () => {
      noise(0.6, { vol: 0.5, freq: 1400 });
      tone(90, 0.4, { type: 'sawtooth', vol: 0.15, slide: -50 });
    },
    horn: () => {
      tone(110, 1.1, { type: 'sawtooth', vol: 0.18 });
      tone(82, 1.1, { type: 'square', vol: 0.06 });
    },
    hornDenied: () => tone(160, 0.1, { type: 'square', vol: 0.06 }),
    lowOil: () => { tone(300, 0.12, { type: 'square', vol: 0.08 }); tone(300, 0.12, { type: 'square', vol: 0.08, delay: 0.18 }); },
    nightClear: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, { type: 'triangle', vol: 0.18, delay: i * 0.11 })),
    gameOver: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.18, delay: i * 0.18 })),
    victory: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.6, { type: 'triangle', vol: 0.16, delay: i * 0.12 })),
  };

  return {
    unlock,
    play(name, arg) {
      if (!ctx || muted || !sounds[name]) return;
      sounds[name](arg);
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
