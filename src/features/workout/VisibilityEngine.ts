import type { SkeletonFrame, Landmark } from './SkeletonMapper';

export type TrackingStatus = 'ACTIVE' | 'DEGRADED' | 'PAUSED';

export interface VisibilityReport {
  status: TrackingStatus;
  primarySide: 'LEFT' | 'RIGHT' | 'BOTH';
  missingCritical: string[];
}

export class VisibilityEngine {
  
  public static evaluateSquat(frame: SkeletonFrame): VisibilityReport {
    // Squat Primary: Hips, Knees
    // Secondary: Ankles, Shoulders
    return this.evaluateRequirements(frame, ['Hip', 'Knee']);
  }

  public static evaluatePushUp(frame: SkeletonFrame): VisibilityReport {
    // Pushup Primary: Shoulders, Elbows, Wrists
    // Secondary: Hips
    return this.evaluateRequirements(frame, ['Shoulder', 'Elbow', 'Wrist']);
  }

  public static evaluateCurl(frame: SkeletonFrame): VisibilityReport {
    // Curls Primary: Shoulders, Elbows, Wrists
    return this.evaluateRequirements(frame, ['Shoulder', 'Elbow', 'Wrist']);
  }

  private static evaluateRequirements(frame: SkeletonFrame, primaryJoints: string[]): VisibilityReport {
    let leftPrimaryScore = 0;
    let rightPrimaryScore = 0;
    
    let missingCritical: string[] = [];

    // Evaluate Left Side
    for (const joint of primaryJoints) {
      const leftName = `left${joint}` as keyof SkeletonFrame;
      const point = frame[leftName] as Landmark | null;
      if (point && point.confidence > 0.4) {
        leftPrimaryScore++;
      }
    }

    // Evaluate Right Side
    for (const joint of primaryJoints) {
      const rightName = `right${joint}` as keyof SkeletonFrame;
      const point = frame[rightName] as Landmark | null;
      if (point && point.confidence > 0.4) {
        rightPrimaryScore++;
      }
    }

    const requiredCount = primaryJoints.length;
    let primarySide: 'LEFT' | 'RIGHT' | 'BOTH' = 'BOTH';
    let status: TrackingStatus = 'ACTIVE';

    if (leftPrimaryScore === requiredCount && rightPrimaryScore === requiredCount) {
      primarySide = 'BOTH';
      status = 'ACTIVE';
    } else if (leftPrimaryScore === requiredCount) {
      primarySide = 'LEFT';
      status = 'DEGRADED'; // One side is hidden, so degraded, but enough to track
    } else if (rightPrimaryScore === requiredCount) {
      primarySide = 'RIGHT';
      status = 'DEGRADED';
    } else {
      // Neither side has full primary joints.
      status = 'PAUSED';
      missingCritical.push(`Need full visibility of ${primaryJoints.join(', ')} on at least one side.`);
    }

    return {
      status,
      primarySide,
      missingCritical
    };
  }
}
