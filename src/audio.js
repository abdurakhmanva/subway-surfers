// Web Audio API Procedural Sound & Music Engine for Subway Surfers
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.jetpackSource = null;
    this.jetpackGain = null;
    this.combo = 0;
    this.lastCoinTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.bgmTimer) {
      this.stopBGM();
    } else if (!this.isMuted && !this.bgmPlaying) {
      this.startBGM();
    }
    return this.isMuted;
  }

  playCoin() {
    if (this.isMuted) return;
    this.init();
    const now = Date.now();
    if (now - this.lastCoinTime < 300) {
      this.combo = Math.min(this.combo + 1, 12);
    } else {
      this.combo = 0;
    }
    this.lastCoinTime = now;

    const baseFreq = 880; // A5
    const notes = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
    const semitones = notes[this.combo % notes.length];
    const freq = baseFreq * Math.pow(2, semitones / 12);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.19);
  }

  playJump() {
    if (this.isMuted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(650, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.21);
  }

  playSlide() {
    if (this.isMuted) return;
    this.init();
    const bufferSize = this.ctx.sampleRate * 0.22;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.2);
    filter.Q.value = 2.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  playPowerup() {
    if (this.isMuted) return;
    this.init();
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startT = this.ctx.currentTime + idx * 0.06;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startT);

      gain.gain.setValueAtTime(0.2, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startT);
      osc.stop(startT + 0.26);
    });
  }

  playCrash() {
    if (this.isMuted) return;
    this.init();
    // Impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.41);

    // Noise crash crunch
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.38);

    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start();
  }

  startJetpackSound() {
    if (this.isMuted || this.jetpackSource) return;
    this.init();
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.jetpackSource = this.ctx.createBufferSource();
    this.jetpackSource.buffer = buffer;
    this.jetpackSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    this.jetpackGain = this.ctx.createGain();
    this.jetpackGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    this.jetpackSource.connect(filter);
    filter.connect(this.jetpackGain);
    this.jetpackGain.connect(this.ctx.destination);

    this.jetpackSource.start();
  }

  stopJetpackSound() {
    if (this.jetpackSource) {
      try {
        this.jetpackGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        setTimeout(() => {
          if (this.jetpackSource) {
            this.jetpackSource.stop();
            this.jetpackSource.disconnect();
            this.jetpackSource = null;
            this.jetpackGain = null;
          }
        }, 120);
      } catch (e) {
        this.jetpackSource = null;
      }
    }
  }

  // Dynamic rhythmic upbeat Subway Surfers style funk groove
  startBGM() {
    if (this.bgmPlaying || this.isMuted) return;
    this.init();
    this.bgmPlaying = true;

    const tempo = 132;
    const stepDuration = 60 / tempo / 4; // 16th notes
    let step = 0;

    // Bassline in D minor: D2, D2, F2, G2, D2, C2, D2, A2
    const bassline = [
      73.42, 0, 73.42, 0, 87.31, 0, 98.0, 0,
      73.42, 0, 65.41, 0, 73.42, 0, 110.0, 0
    ];

    const melody = [
      293.66, 0, 329.63, 0, 349.23, 392.0, 0, 349.23,
      329.63, 0, 293.66, 0, 261.63, 0, 293.66, 0
    ];

    const tick = () => {
      if (!this.bgmPlaying || this.isMuted) return;
      const t = this.ctx.currentTime;
      const s = step % 16;

      // Kick on 0, 4, 8, 12
      if (s % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.08);
        kickGain.gain.setValueAtTime(0.25, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        kickOsc.connect(kickGain);
        kickGain.connect(this.ctx.destination);
        kickOsc.start(t);
        kickOsc.stop(t + 0.11);
      }

      // Snare on 4, 12
      if (s === 4 || s === 12) {
        const snareNoise = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
        const data = snareNoise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = snareNoise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 800;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(t);
      }

      // Hi-hat every 2 steps
      if (s % 2 === 0) {
        const hihat = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.03, this.ctx.sampleRate);
        const d = hihat.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = hihat;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(t);
      }

      // Bass synth
      const bassNote = bassline[s];
      if (bassNote > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassNote, t);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);
        filter.frequency.exponentialRampToValueAtTime(150, t + stepDuration);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + stepDuration * 0.9);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + stepDuration);
      }

      // Lead melody (every other bar)
      const leadNote = melody[s];
      if (leadNote > 0 && Math.floor(step / 16) % 2 === 1) {
        const lead = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        lead.type = 'triangle';
        lead.frequency.setValueAtTime(leadNote, t);

        leadGain.gain.setValueAtTime(0.08, t);
        leadGain.gain.exponentialRampToValueAtTime(0.005, t + stepDuration * 0.8);

        lead.connect(leadGain);
        leadGain.connect(this.ctx.destination);
        lead.start(t);
        lead.stop(t + stepDuration);
      }

      step++;
      this.bgmTimer = setTimeout(tick, stepDuration * 1000);
    };

    tick();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const sounds = new SoundEngine();
