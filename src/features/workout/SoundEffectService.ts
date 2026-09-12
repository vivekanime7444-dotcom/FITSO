export class SoundEffectService {
  private static ctx: AudioContext | null = null;
  private static enabled = true;

  public static init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Soft, futuristic sci-fi selection blip
  public static playNavClick() {
    if (!this.enabled || !this.ctx) return;
    
    // Very quick high-tech blip (mix of high freq sine and rapid decay)
    this.playTone(1800, 'sine', 0.02, 0.03);
    setTimeout(() => this.playTone(2400, 'sine', 0.03, 0.02), 20);
  }

  public static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private static playTone(frequency: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!this.enabled || !this.ctx) return;
    
    // Resume context if suspended (common browser policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    
    // Quick attack and decay for digital feel
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Very short subtle click for data entry
  public static playClick() {
    this.playTone(800, 'sine', 0.05, 0.05);
  }

  // Futuristic button press
  public static playButton() {
    this.playTone(400, 'square', 0.1, 0.05);
  }

  // Set Complete confirmation
  public static playConfirm() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(600, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(900, 'sine', 0.15, 0.1), 100);
  }

  // System Notification (Before voice speaks)
  public static playNotification() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(1200, 'triangle', 0.1, 0.05);
    setTimeout(() => this.playTone(1600, 'triangle', 0.2, 0.05), 100);
  }

  // Mission Start
  public static playMissionStart() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(300, 'square', 0.2, 0.1);
    setTimeout(() => this.playTone(400, 'square', 0.2, 0.1), 150);
    setTimeout(() => this.playTone(600, 'square', 0.4, 0.1), 300);
  }

  // Mission Complete
  public static playMissionComplete() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(800, 'sine', 0.2, 0.1);
    setTimeout(() => this.playTone(1200, 'sine', 0.2, 0.1), 200);
    setTimeout(() => this.playTone(1600, 'sine', 0.6, 0.1), 400);
  }
}
