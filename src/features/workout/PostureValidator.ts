import type { SkeletonFrame } from './SkeletonMapper';

export type PostureState = 'STANDING' | 'SITTING' | 'HORIZONTAL' | 'UNKNOWN';

export class PostureValidator {
  
  public static classifyPosture(frame: SkeletonFrame): PostureState {
    const { leftShoulder, rightShoulder, leftHip, rightHip, leftAnkle, rightAnkle } = frame;
    
    // We need at least one shoulder and one hip to make basic posture guesses
    const shoulder = leftShoulder && leftShoulder.confidence > 0.4 ? leftShoulder : rightShoulder;
    const hip = leftHip && leftHip.confidence > 0.4 ? leftHip : rightHip;

    if (!shoulder || !hip) return 'UNKNOWN';

    // In camera coordinates, Y goes DOWN (0 is top, 1 is bottom)
    const torsoVerticalDistance = Math.abs(hip.y - shoulder.y);
    const torsoHorizontalDistance = Math.abs(hip.x - shoulder.x);

    // 1. Check if user is HORIZONTAL
    // If the horizontal distance between shoulder and hip is greater than vertical
    // NOTE: This applies heavily to SIDE profiles. If facing FRONT, the X distance is 0 but Z distance is large.
    // So let's check Z as well if available.
    const torsoDepthDistance = Math.abs(hip.z - shoulder.z);

    if (torsoHorizontalDistance > torsoVerticalDistance * 1.2 || torsoDepthDistance > torsoVerticalDistance * 1.5) {
      return 'HORIZONTAL';
    }

    // Distinguish standing vs sitting using ankles
    const ankle = leftAnkle && leftAnkle.confidence > 0.4 ? leftAnkle : rightAnkle;
    if (ankle) {
      const legVerticalDistance = Math.abs(ankle.y - hip.y);
      // If legs are long vertically relative to torso, they are standing.
      if (legVerticalDistance > torsoVerticalDistance * 0.8) {
        return 'STANDING';
      } else {
        return 'SITTING';
      }
    }
    
    return 'SITTING'; // Fallback if no legs visible but upright
  }

  public static isReadyForPushUp(frame: SkeletonFrame): boolean {
    const posture = this.classifyPosture(frame);
    if (posture !== 'HORIZONTAL') return false;

    // Wrist validation
    const wrist = (frame.leftWrist && frame.leftWrist.confidence > 0.4) ? frame.leftWrist : frame.rightWrist;
    const shoulder = (frame.leftShoulder && frame.leftShoulder.confidence > 0.4) ? frame.leftShoulder : frame.rightShoulder;
    
    if (!shoulder || !wrist) return false;
    
    // Wrists should be below shoulders in Y coordinate (higher value)
    if (wrist.y < shoulder.y - 0.1) return false;

    return true;
  }

  public static isReadyForSquat(frame: SkeletonFrame): boolean {
    const posture = this.classifyPosture(frame);
    if (posture !== 'STANDING') return false;

    return true;
  }

  public static isReadyForCurl(frame: SkeletonFrame): boolean {
    const posture = this.classifyPosture(frame);
    // Curls can be done standing or sitting, but not horizontal
    if (posture === 'HORIZONTAL' || posture === 'UNKNOWN') return false;

    // Wrist should be below shoulder to start
    const wrist = (frame.leftWrist && frame.leftWrist.confidence > 0.4) ? frame.leftWrist : frame.rightWrist;
    const shoulder = (frame.leftShoulder && frame.leftShoulder.confidence > 0.4) ? frame.leftShoulder : frame.rightShoulder;
    
    if (shoulder && wrist) {
      if (wrist.y < shoulder.y) return false;
    }

    return true;
  }
}
