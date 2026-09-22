import type { SkeletonFrame, Landmark } from '../SkeletonMapper';
import type { BodyOrientation } from '../BodyOrientationDetector';
import type { VisibilityReport } from '../VisibilityEngine';

export class PullUpAnalyzer {
  
  private static calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return angle;
  }

  public static getROM(frame: SkeletonFrame, _orientation: BodyOrientation, visibility: VisibilityReport): number | null {
    if (visibility.status === 'PAUSED') return null;

    // Use strongest visible side
    const useLeft = visibility.primarySide === 'LEFT' || visibility.primarySide === 'BOTH';
    const shoulder = useLeft ? frame.leftShoulder! : frame.rightShoulder!;
    const elbow = useLeft ? frame.leftElbow! : frame.rightElbow!;
    const wrist = useLeft ? frame.leftWrist! : frame.rightWrist!;

    if (!shoulder || !elbow || !wrist) return null;

    // 1. Calculate elbow angle (180 = straight arm hang, ~45-90 = top of pull-up)
    const elbowAngle = this.calculateAngle(shoulder, elbow, wrist);

    // 2. Calculate vertical displacement of shoulder relative to wrist
    // In camera coords, y=0 is top.
    // Hanging: wrist is high (y=0.2), shoulder is low (y=0.6). verticalDist = 0.4
    // Top of pullup: wrist is (y=0.2), shoulder is near it (y=0.25). verticalDist = 0.05
    // We normalize this by the length of the arm (shoulder to elbow + elbow to wrist)
    const upperArmLen = Math.hypot(shoulder.x - elbow.x, shoulder.y - elbow.y);
    const lowerArmLen = Math.hypot(elbow.x - wrist.x, elbow.y - wrist.y);
    const armLen = upperArmLen + lowerArmLen;
    
    // Vertical distance from wrist down to shoulder. (Negative if shoulder goes above wrist)
    const verticalDist = shoulder.y - wrist.y;
    const normalizedDist = verticalDist / (armLen || 0.01);

    // Let's blend elbow angle and vertical distance for a robust ROM
    
    // Angle ROM:
    // Angle 160+ = 0%
    // Angle 70- = 100%
    let angleRom = ((160 - elbowAngle) / (160 - 70)) * 100;
    angleRom = Math.max(0, Math.min(100, angleRom));

    // Vertical ROM:
    // Distance 0.8+ (arms fully stretched) = 0%
    // Distance 0.2- (shoulder very close to or above wrist) = 100%
    let distRom = ((0.8 - normalizedDist) / (0.8 - 0.2)) * 100;
    distRom = Math.max(0, Math.min(100, distRom));

    // We take the average or the stronger signal.
    // If the angle is hard to see from the front, vertical distance still works.
    // If they lean back and vertical distance fails, angle still works.
    let finalRom = (angleRom + distRom) / 2;
    
    return Math.max(0, Math.min(100, finalRom));
  }
}
