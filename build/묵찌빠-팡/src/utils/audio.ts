// Enhanced Web Audio API synthesizer for arcade sound effects & BGM
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.8;
  private bgmVolume: number = 0.5;
  private sfxVolume: number = 0.8;

  private bgmOscillator: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;

  private captionCallback: ((caption: string) => void) | null = null;

  public setCaptionCallback(cb: ((caption: string) => void) | null) {
    this.captionCallback = cb;
  }

  private emitCaption(text: string) {
    if (this.captionCallback) {
      this.captionCallback(text);
    }
  }

  public initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isBgmPlaying) {
      this.stopBGM();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isBgmPlaying) {
      this.stopBGM();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolumes(master: number, bgm: number, sfx: number) {
    this.masterVolume = master;
    this.bgmVolume = bgm;
    this.sfxVolume = sfx;

    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume * this.bgmVolume * 0.08,
        this.ctx.currentTime
      );
    }
  }

  public vibrate(pattern: number | number[] = 40) {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(pattern);
      } catch {}
    }
  }

  // BGM Loop
  public startBGM() {
    if (this.isMuted || this.isBgmPlaying || this.masterVolume <= 0 || this.bgmVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      this.bgmOscillator = this.ctx.createOscillator();
      this.bgmGain = this.ctx.createGain();

      this.bgmOscillator.type = 'triangle';
      this.bgmOscillator.frequency.setValueAtTime(220, this.ctx.currentTime); // A3

      const gainVal = this.masterVolume * this.bgmVolume * 0.05;
      this.bgmGain.gain.setValueAtTime(gainVal, this.ctx.currentTime);

      this.bgmOscillator.connect(this.bgmGain);
      this.bgmGain.connect(this.ctx.destination);

      this.bgmOscillator.start();
      this.isBgmPlaying = true;
    } catch {}
  }

  public stopBGM() {
    if (this.bgmOscillator) {
      try {
        this.bgmOscillator.stop();
        this.bgmOscillator.disconnect();
      } catch {}
      this.bgmOscillator = null;
    }
    this.isBgmPlaying = false;
  }

  // SFX Helper
  private getEffectiveSfxGain(baseGain: number = 0.2): number {
    if (this.isMuted) return 0;
    return baseGain * this.masterVolume * this.sfxVolume;
  }

  public playClick() {
    const gainVal = this.getEffectiveSfxGain(0.15);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
      this.vibrate(20);
    } catch {}
  }

  public playSelectRPS() {
    this.emitCaption('🔊 [효과음] 가위바위보 패 선택!');
    const gainVal = this.getEffectiveSfxGain(0.2);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
      this.vibrate(35);
    } catch {}
  }

  public playTick() {
    this.emitCaption('🔊 [효과음] 카운트다운 째깍!');
    const gainVal = this.getEffectiveSfxGain(0.12);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  public playCountdownGo() {
    this.emitCaption('🔊 [효과음] 경기 시작 (START!)');
    const gainVal = this.getEffectiveSfxGain(0.25);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(1046.5, now + 0.08); // C6

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
      this.vibrate([40, 30, 40]);
    } catch {}
  }

  public playMatchFound() {
    this.emitCaption('🔊 [알림] 매칭 완료! 상대 등장!');
    const gainVal = this.getEffectiveSfxGain(0.25);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(gainVal, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.15);
      });
      this.vibrate([60, 40, 60]);
    } catch {}
  }

  public playSlotSpin() {
    const gainVal = this.getEffectiveSfxGain(0.08);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300 + Math.random() * 200, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  public playShowdownImpact() {
    this.emitCaption('🔊 [효과음] 가위바위보 충돌 (IMPACT!)');
    const gainVal = this.getEffectiveSfxGain(0.3);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
      this.vibrate([80, 20, 80]);
    } catch {}
  }

  public playWin() {
    this.emitCaption('🏆 [효과음] 승리 환호성! (VICTORY)');
    const gainVal = this.getEffectiveSfxGain(0.25);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(gainVal, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.2);
      });
      this.vibrate([50, 30, 50, 30, 100]);
    } catch {}
  }

  public playLose() {
    this.emitCaption('💀 [효과음] 패배 사운드 (DEFEAT)');
    const gainVal = this.getEffectiveSfxGain(0.2);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [400, 350, 300, 220];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(gainVal, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.18);
      });
      this.vibrate(100);
    } catch {}
  }

  public playDraw() {
    this.emitCaption('🤝 [효과음] 무승부! (DRAW)');
    const gainVal = this.getEffectiveSfxGain(0.2);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(440, now + 0.1);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  public playCoin() {
    this.emitCaption('💰 [효과음] 포인트 코인 획득!');
    const gainVal = this.getEffectiveSfxGain(0.2);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.08);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
      this.vibrate([30, 30, 30]);
    } catch {}
  }

  public playTournamentAlert() {
    this.emitCaption('🎺 [알림] 토너먼트 대진 및 진행 알림!');
    const gainVal = this.getEffectiveSfxGain(0.25);
    if (gainVal <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [587.33, 739.99, 880, 1174.66]; // D5 F#5 A5 D6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(gainVal, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.09 + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.2);
      });
      this.vibrate([40, 40, 80]);
    } catch {}
  }
}

export const sound = new SoundEngine();
