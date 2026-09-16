import type { SkeletonFrame } from './SkeletonMapper';

export interface MovementData {
  rom: number; 
  velocity: number; 
  direction: 'TOWARD_TARGET' | 'TOWARD_START' | 'STATIONARY';
  isCameraShake: boolean;
}

export class MovementTracker {
  private history: { time: number, rom: number, frame: SkeletonFrame }[] = [];
  private readonly MAX_HISTORY = 10; // keep last 10 frames (~300ms at 30fps)
  
  public addFrame(frame: SkeletonFrame, currentRom: number, now: number): MovementData {
    this.history.push({ time: now, rom: currentRom, frame });
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    // 1. Calculate Velocity
    let velocity = 0;
    let direction: 'TOWARD_TARGET' | 'TOWARD_START' | 'STATIONARY' = 'STATIONARY';
    
    if (this.history.length >= 3) {
      const oldest = this.history[0];
      const dt = (now - oldest.time) / 1000.0; // seconds
      if (dt > 0) {
        velocity = (currentRom - oldest.rom) / dt;
      }
      
      // Determine direction (hysteresis: need more than 5% change per second)
      if (velocity > 15) {
        direction = 'TOWARD_TARGET';
      } else if (velocity < -15) {
        direction = 'TOWARD_START';
      }
    }

    // 2. Global Camera Shake Detection
    // If the shoulders and hips all move drastically in the same X/Y direction simultaneously, it's likely a camera shake.
    let isCameraShake = false;
    if (this.history.length >= 5) {
       const oldest = this.history[0].frame;
       const leftShoulderDx = (frame.leftShoulder?.x || 0) - (oldest.leftShoulder?.x || 0);
       const rightShoulderDx = (frame.rightShoulder?.x || 0) - (oldest.rightShoulder?.x || 0);
       const leftHipDx = (frame.leftHip?.x || 0) - (oldest.leftHip?.x || 0);
       const rightHipDx = (frame.rightHip?.x || 0) - (oldest.rightHip?.x || 0);

       const allMovedLeft = leftShoulderDx < -0.05 && rightShoulderDx < -0.05 && leftHipDx < -0.05 && rightHipDx < -0.05;
       const allMovedRight = leftShoulderDx > 0.05 && rightShoulderDx > 0.05 && leftHipDx > 0.05 && rightHipDx > 0.05;

       if (allMovedLeft || allMovedRight) {
         isCameraShake = true;
       }
    }

    return {
      rom: currentRom,
      velocity,
      direction,
      isCameraShake
    };
  }
  
  public reset() {
    this.history = [];
  }
}
