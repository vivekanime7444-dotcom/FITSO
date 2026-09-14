import type { SkeletonFrame, Landmark } from '../SkeletonMapper';
import type { BodyOrientation } from '../BodyOrientationDetector';
import type { VisibilityReport } from '../VisibilityEngine';

export class CurlAnalyzer {
  
  private static calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return angle;
  }

  private static calculateFrontAngle(shoulder: Landmark, elbow: Landmark, wrist: Landmark): number {
    // For front view curls, 3D math on 2D projections is tricky if they curl directly at the camera.
    // We measure vertical displacement of wrist relative to elbow.
    // If wrist is below elbow, arm is straight (~180).
    // If wrist is far above elbow, arm is curled (~45).
    
    // Normalize based on upper arm length
    const upperArmLength = Math.abs(elbow.y - shoulder.y);
    const forearmVertical = wrist.y - elbow.y; // Positive if wrist is below elbow
    
    // ratio: 1.0 = straight (wrist far below elbow)
    // ratio: -1.0 = fully curled (wrist far above elbow)
    const ratio = forearmVertical / (upperArmLength || 0.01);
    
    // Convert ratio back to an approximate angle for the state machine
    // straight ~ 170, curled ~ 40
    let approxAngle = 170;
    if (ratio < 0) {
      // curled
      approxAngle = 90 - (Math.abs(ratio) * 50);
    } else {
      // extended
      approxAngle = 90 + (ratio * 80);
    }
    
    return Math.max(30, Math.min(180, approxAngle));
  }

  public static getPrimaryMetric(frame: SkeletonFrame, orientation: BodyOrientation, visibility: VisibilityReport): number | null {
    if (visibility.status === 'PAUSED') return null;

    // We can track either arm. If BOTH, average them or just take the most visible.
    // For simplicity, we just use the primarySide as dictated by VisibilityEngine.
    const useLeft = visibility.primarySide === 'LEFT' || visibility.primarySide === 'BOTH';
    
    const shoulder = useLeft ? frame.leftShoulder! : frame.rightShoulder!;
    const elbow = useLeft ? frame.leftElbow! : frame.rightElbow!;
    const wrist = useLeft ? frame.leftWrist! : frame.rightWrist!;

    if (!shoulder || !elbow || !wrist) return null;

    // Check for excessive upper body movement / cheating (Elbow drifting far forward or backward from shoulder)
    // In side profile, elbow X should remain relatively close to shoulder X.
    // In side profile, elbow X should remain relatively close to shoulder X.
    // If elbow drifts heavily, they are cheating or swinging, but we might still count it if it's not extreme.
    // We'll let the angle logic handle the ROM, but this is a future hook for "bad form" warnings.

    if (orientation === 'LEFT_PROFILE' || orientation === 'RIGHT_PROFILE') {
      // Side view, angle is highly accurate
      return this.calculateAngle(shoulder, elbow, wrist);
    } else if (orientation === 'FRONT' || orientation === 'BACK') {
      // Front view, angle compresses, use vertical heuristic
      return this.calculateFrontAngle(shoulder, elbow, wrist);
    } else {
      // Three-quarter view
      return this.calculateAngle(shoulder, elbow, wrist);
    }
  }
}
