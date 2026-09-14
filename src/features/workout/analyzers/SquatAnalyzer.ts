import type { SkeletonFrame, Landmark } from '../SkeletonMapper';
import type { BodyOrientation } from '../BodyOrientationDetector';
import type { VisibilityReport } from '../VisibilityEngine';

export class SquatAnalyzer {
  
  private static calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return angle;
  }

  private static calculateFrontSquatDepth(hip: Landmark, knee: Landmark, ankle: Landmark): number {
    // In a front squat, angle calculation fails because the leg is moving directly at the camera.
    // Instead, we measure the vertical displacement of the hip relative to the knee.
    // 180 (standing) -> hip is far above knee.
    // 90 (squat) -> hip is roughly parallel to knee in Y.
    
    // Normalize based on shin length (which doesn't change much visually in a squat)
    const shinLength = Math.abs(ankle.y - knee.y);
    const thighVertical = hip.y - knee.y; // Normally negative (hip is above knee, 0 is top)
    
    // If hip.y >= knee.y, thigh is parallel or below parallel.
    if (thighVertical >= 0) return 90; // Deep squat
    
    const ratio = Math.abs(thighVertical) / (shinLength || 0.01);
    
    // ratio 1.0 = standing up
    // ratio 0.0 = parallel
    return 90 + Math.min(ratio, 1.0) * 90; // Returns 90 to 180
  }

  public static getPrimaryMetric(frame: SkeletonFrame, orientation: BodyOrientation, visibility: VisibilityReport): number | null {
    if (visibility.status === 'PAUSED') return null;

    const useLeft = visibility.primarySide === 'LEFT' || visibility.primarySide === 'BOTH';
    const hip = useLeft ? frame.leftHip! : frame.rightHip!;
    const knee = useLeft ? frame.leftKnee! : frame.rightKnee!;
    const ankle = useLeft ? (frame.leftAnkle || frame.leftHeel) : (frame.rightAnkle || frame.rightHeel);

    if (!hip || !knee || !ankle) return null;

    if (orientation === 'LEFT_PROFILE' || orientation === 'RIGHT_PROFILE') {
      // Side view, standard angle works perfectly
      return this.calculateAngle(hip, knee, ankle);
    } else if (orientation === 'FRONT' || orientation === 'BACK') {
      // Front view, use vertical displacement heuristic
      return this.calculateFrontSquatDepth(hip, knee, ankle);
    } else {
      // Three-quarter view, standard angle usually works okay, but displacement is safer
      // We will blend or just use standard angle.
      return this.calculateAngle(hip, knee, ankle);
    }
  }
}
