// Temporal smoothing for noisy landmarks

export class LandmarkSmoother {
  private smoothedLandmarks: any[] = [];
  private readonly alpha: number;

  constructor(alpha: number = 0.3) {
    this.alpha = alpha; // lower = smoother but more lag
  }

  public smooth(landmarks: any[]): any[] {
    if (!landmarks || landmarks.length === 0) return [];
    
    if (this.smoothedLandmarks.length === 0) {
      // First frame
      this.smoothedLandmarks = JSON.parse(JSON.stringify(landmarks));
      return this.smoothedLandmarks;
    }

    // Apply EMA
    for (let i = 0; i < landmarks.length; i++) {
      if (!this.smoothedLandmarks[i]) continue;
      
      const curr = landmarks[i];
      const prev = this.smoothedLandmarks[i];

      this.smoothedLandmarks[i] = {
        x: prev.x + this.alpha * (curr.x - prev.x),
        y: prev.y + this.alpha * (curr.y - prev.y),
        z: prev.z + this.alpha * (curr.z - prev.z),
        visibility: prev.visibility + this.alpha * (curr.visibility - prev.visibility),
      };
    }

    return this.smoothedLandmarks;
  }
  
  public reset() {
    this.smoothedLandmarks = [];
  }
}

export class TemporalValidator {
  private lastState: string | null = null;
  private stateStartTime: number = 0;
  private readonly requiredDurationMs: number;

  constructor(requiredDurationMs: number = 1000) {
    this.requiredDurationMs = requiredDurationMs;
  }

  // Returns true if the state has been consistently true for the required duration
  public validate(currentState: string): boolean {
    const now = performance.now();

    if (currentState !== this.lastState) {
      this.lastState = currentState;
      this.stateStartTime = now;
      return false; // Just changed, not stable yet
    }

    // State is the same, check duration
    if (now - this.stateStartTime >= this.requiredDurationMs) {
      return true;
    }

    return false;
  }

  public reset() {
    this.lastState = null;
    this.stateStartTime = 0;
  }
}
