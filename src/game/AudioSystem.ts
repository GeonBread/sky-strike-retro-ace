export class AudioSystem {
  ctx: AudioContext | null = null;
  bgmVolumeParams: GainNode | null = null;
  sfxVolumeParams: GainNode | null = null;
  bgmInterval: number | null = null;
  isPlayingBgm = false;

  bgmVol = 0.5;
  sfxVol = 0.8;

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
      
      this.bgmVolumeParams = this.ctx.createGain();
      this.bgmVolumeParams.gain.value = this.bgmVol;
      this.bgmVolumeParams.connect(this.ctx.destination);
      
      this.sfxVolumeParams = this.ctx.createGain();
      this.sfxVolumeParams.gain.value = this.sfxVol;
      this.sfxVolumeParams.connect(this.ctx.destination);
    }
  }

  setVolumes(bgm: number, sfx: number) {
    this.bgmVol = bgm;
    this.sfxVol = sfx;
    if (this.bgmVolumeParams) this.bgmVolumeParams.gain.value = this.bgmVol;
    if (this.sfxVolumeParams) this.sfxVolumeParams.gain.value = this.sfxVol;
  }

  pauseAll() {
    if (this.ctx && this.ctx.state === "running") {
      this.ctx.suspend();
    }
  }

  resumeAll() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playOscillator(freq: number, type: OscillatorType, duration: number, slideFreq?: number) {
    if (!this.ctx || !this.sfxVolumeParams) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxVolumeParams);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNoise(duration: number) {
    if (!this.ctx || !this.sfxVolumeParams) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    // basic lowpass filter effect over time for explosions
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(gain);
    gain.connect(this.sfxVolumeParams);
    noise.start();
  }

  shoot() {
    if (!this.ctx || !this.sfxVolumeParams) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Softer triangle wave, shorter duration and much lower volume
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxVolumeParams);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  satelliteShoot() {
    if (!this.ctx || !this.sfxVolumeParams) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Very gentle high-tech pulse chirp
    osc.type = 'sine';
    osc.frequency.setValueAtTime(850, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.015, this.ctx.currentTime); // quiet and subtle
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxVolumeParams);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  satelliteDestroy() {
    if (!this.ctx || !this.sfxVolumeParams) return;
    
    // Retro chime shatter effect
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxVolumeParams);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);

    // High metal crackle
    const spark = this.ctx.createOscillator();
    const sparkGain = this.ctx.createGain();
    spark.type = 'sine';
    spark.frequency.setValueAtTime(1400, this.ctx.currentTime);
    spark.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);

    sparkGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    spark.connect(sparkGain);
    sparkGain.connect(this.sfxVolumeParams);

    spark.start();
    spark.stop(this.ctx.currentTime + 0.08);
  }

  hit() {
    if (!this.ctx || !this.sfxVolumeParams) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxVolumeParams);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  enemyHit() {
    if (!this.ctx || !this.sfxVolumeParams) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Soft triangle sweep with high clink for snappy impact
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.06);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
    
    osc.connect(gain);
    gain.connect(this.sfxVolumeParams);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  enemyExplode() {
    if (!this.ctx || !this.sfxVolumeParams) return;
    
    // Low frequency boomy bass explosion
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(160, this.ctx.currentTime);
    boom.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.22);
    boomGain.gain.setValueAtTime(0.20, this.ctx.currentTime);
    boomGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
    
    boom.connect(boomGain);
    boomGain.connect(this.sfxVolumeParams);
    boom.start();
    boom.stop(this.ctx.currentTime + 0.22);
    
    // Noisy high-frequency space debris crackle
    const bufSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxVolumeParams);
    
    noise.start();
    noise.stop(this.ctx.currentTime + 0.12);
  }

  powerup() {
    this.playOscillator(400, 'sine', 0.2, 800);
    setTimeout(() => this.playOscillator(600, 'sine', 0.2, 1200), 100);
  }
  
  bossHit() {
    if (!this.ctx || !this.sfxVolumeParams) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Triangle wave is softer and less annoying over 3000 hits
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.04);
    
    // Quiet, highly satisfying punchy click
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    
    osc.connect(gain);
    gain.connect(this.sfxVolumeParams);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);

    // High pitch crisp clink
    const clink = this.ctx.createOscillator();
    const clinkGain = this.ctx.createGain();
    clink.type = 'sine';
    clink.frequency.setValueAtTime(1800, this.ctx.currentTime);
    clink.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.02);
    clinkGain.gain.setValueAtTime(0.012, this.ctx.currentTime);
    clinkGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);
    clink.connect(clinkGain);
    clinkGain.connect(this.sfxVolumeParams);
    clink.start();
    clink.stop(this.ctx.currentTime + 0.02);
  }

  bossExplode() {
    this.playNoise(1.5);
    this.playOscillator(150, 'sawtooth', 1.5, 20);
  }

  bossPatternFire() {
    if (!this.ctx || !this.sfxVolumeParams) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxVolumeParams);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  laserBlast() {
    if (!this.ctx || !this.sfxVolumeParams) return;

    const beam = this.ctx.createOscillator();
    const beamGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    beam.type = "sawtooth";
    beam.frequency.setValueAtTime(1100, this.ctx.currentTime);
    beam.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.28);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1700, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(360, this.ctx.currentTime + 0.28);
    beamGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    beamGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
    beam.connect(filter);
    filter.connect(beamGain);
    beamGain.connect(this.sfxVolumeParams);
    beam.start();
    beam.stop(this.ctx.currentTime + 0.28);

    const crackleSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, crackleSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < crackleSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / crackleSize);
    const crackle = this.ctx.createBufferSource();
    const crackleGain = this.ctx.createGain();
    const crackleFilter = this.ctx.createBiquadFilter();
    crackle.buffer = buffer;
    crackleFilter.type = "highpass";
    crackleFilter.frequency.value = 2400;
    crackleGain.gain.setValueAtTime(0.045, this.ctx.currentTime);
    crackleGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    crackle.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(this.sfxVolumeParams);
    crackle.start();
    crackle.stop(this.ctx.currentTime + 0.08);
  }

  bossDash() {
    if (!this.ctx || !this.sfxVolumeParams) return;

    const sweep = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(90, this.ctx.currentTime);
    sweep.frequency.exponentialRampToValueAtTime(540, this.ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.16, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
    sweep.connect(gain);
    gain.connect(this.sfxVolumeParams);
    sweep.start();
    sweep.stop(this.ctx.currentTime + 0.22);

    this.playNoise(0.12);
  }

  startBossBgm() {
    this.stopBgm();
    if (!this.ctx) return;
    this.isPlayingBgm = true;

    // Extremely epic, dark cybernetic speedcore boss theme
    // A dramatic descending and ascending industrial block in D minor (D -> Bb -> G# -> A -> C)
    const chords = [
      [73.42, 110.00, 146.83], // Dm
      [73.42, 110.00, 146.83],
      [58.27, 116.54, 155.56], // Bb
      [58.27, 116.54, 155.56],
      [51.91, 103.83, 138.59], // G# / Ab (tritone tension!)
      [51.91, 103.83, 138.59],
      [55.00, 110.00, 165.00], // A
      [65.41, 130.81, 196.00]  // C
    ];
    let step = 0;
    
    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.bgmVolumeParams) return;
      const noteGroup = chords[step % chords.length];
      
      noteGroup.forEach((freq, idx) => {
        if (!this.ctx || !this.bgmVolumeParams) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.type = idx === 2 ? 'sawtooth' : 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(idx === 2 ? 1200 : 500, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.16);

        osc.frequency.setValueAtTime(freq * (idx === 2 ? 1.5 : 1), this.ctx.currentTime);
        
        const vol = idx === 0 ? 0.08 : (idx === 1 ? 0.05 : 0.02);
        gain.gain.setValueAtTime(vol * 0.85, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmVolumeParams);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.16);
      });
      
      // Urgent alerts every 4th step
      if (step % 4 === 0) {
        const blip = this.ctx.createOscillator();
        const blipGain = this.ctx.createGain();
        blip.type = 'sawtooth';
        blip.frequency.setValueAtTime(step % 8 === 0 ? 880 : 1320, this.ctx.currentTime);
        blip.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.08);
        blipGain.gain.setValueAtTime(0.012, this.ctx.currentTime);
        blipGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        
        const blipFilter = this.ctx.createBiquadFilter();
        blipFilter.type = 'highpass';
        blipFilter.frequency.setValueAtTime(900, this.ctx.currentTime);
        
        blip.connect(blipFilter);
        blipFilter.connect(blipGain);
        blipGain.connect(this.bgmVolumeParams);
        
        blip.start();
        blip.stop(this.ctx.currentTime + 0.08);
      }
      
      step++;
    }, 140);
  }

  startBgm() {
    if (this.isPlayingBgm || !this.ctx) return;
    this.isPlayingBgm = true;
    
    // Synth-wave style bassline for a driving retro feel
    const notes = [
      130.81, 130.81, 155.56, 130.81, 
      174.61, 130.81, 196.00, 155.56
    ];
    let step = 0;
    
    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.bgmVolumeParams) return;
      const freq = notes[step % notes.length];
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      osc.type = 'square';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);

      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmVolumeParams);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
      
      step++;
    }, 150);
  }

  stopBgm() {
    this.isPlayingBgm = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const sfx = new AudioSystem();
