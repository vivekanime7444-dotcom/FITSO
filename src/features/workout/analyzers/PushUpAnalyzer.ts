import type { SkeletonFrame, Landmark } from '../SkeletonMapper';
import type { BodyOrientation } from '../BodyOrientationDetector';
import type { VisibilityReport } from '../VisibilityEngine';

export class PushUpAnalyzer {
  
  private static calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return angle;
  }

  // Uses Y and Z to calculate angle if user is facing front
  private static calculateFrontAngle(shoulder: Landmark, elbow: Landmark, wrist: Landmark): number {
    // When facing front, X doesn't change much for a pushup. The movement is in Y and Z.
    // However, 3D math on 2D projections is tricky. Let's use the Y distance relative to shoulder width.
    const armLengthY = Math.abs(wrist.y - shoulder.y);
    const elbowOffset = Math.abs(elbow.y - shoulder.y);
    
    // As elbow offset approaches 0 (elbow parallel to shoulder), angle approaches 90.
    // As elbow offset approaches armLengthY (arm straight), angle approaches 180.
    const ratio = elbowOffset / (armLengthY || 0.01);
    // rough approximation for front view
    return 90 + (ratio * 90); 
  }

  public static getPrimaryMetric(frame: SkeletonFrame, orientation: BodyOrientation, visibility: VisibilityReport): number | null {
    if (visibility.status === 'PAUSED') return null;

    const useLeft = visibility.primarySide === 'LEFT' || visibility.primarySide === 'BOTH';
    const shoulder = useLeft ? frame.leftShoulder! : frame.rightShoulder!;
    const elbow = useLeft ? frame.leftElbow! : frame.rightElbow!;
    const wrist = useLeft ? frame.leftWrist! : frame.rightWrist!;

    if (orientation === 'LEFT_PROFILE' || orientation === 'RIGHT_PROFILE') {
      // Perfect side view, X and Y coordinates are highly reliable for angle
      return this.calculateAngle(shoulder, elbow, wrist);
    } else if (orientation === 'FRONT' || orientation === 'BACK') {
      // Front view, X is compressed. Use Y and Z heuristic.
      return this.calculateFrontAngle(shoulder, elbow, wrist);
    } else {
      // Three-quarter view. A mix of both, standard angle works decently well.
      return this.calculateAngle(shoulder, elbow, wrist);
    }
  }
}
