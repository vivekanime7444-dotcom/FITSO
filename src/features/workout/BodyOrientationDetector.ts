import type { SkeletonFrame } from './SkeletonMapper';

export type BodyOrientation = 'FRONT' | 'BACK' | 'LEFT_PROFILE' | 'RIGHT_PROFILE' | 'THREE_QUARTER_LEFT' | 'THREE_QUARTER_RIGHT' | 'UNKNOWN';

export class BodyOrientationDetector {

  public static detect(frame: SkeletonFrame): BodyOrientation {
    const { leftShoulder, rightShoulder, leftHip, rightHip } = frame;
    
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return 'UNKNOWN';
    }

    // High confidence required for orientation logic based on both sides
    if (leftShoulder.confidence < 0.3 && rightShoulder.confidence < 0.3) return 'UNKNOWN';

    // 1. Z-depth analysis (which side is closer to camera)
    // MediaPipe Z values: negative means closer to the camera.
    // If leftShoulder Z is significantly lower than rightShoulder Z, left side is closer.
    const shoulderZDiff = leftShoulder.z - rightShoulder.z;
    
    // 2. X-width analysis
    // When facing front, the X distance between shoulders is maximal.
    // When facing side, the X distance between shoulders approaches 0.
    // X is normalized 0..1, so a normal front-facing shoulder width is roughly 0.15 - 0.25
    const shoulderXDist = Math.abs(leftShoulder.x - rightShoulder.x);
    
    const isProfile = shoulderXDist < 0.08; // Shoulders are highly overlapped horizontally
    const isFrontal = shoulderXDist > 0.15; // Shoulders are wide
    
    if (isProfile) {
      // It's a profile view. Which side is closer?
      if (shoulderZDiff < -0.05) {
        return 'LEFT_PROFILE';
      } else if (shoulderZDiff > 0.05) {
        return 'RIGHT_PROFILE';
      }
      // Fallback if Z isn't clear but they are overlapping
      return (leftShoulder.x < rightShoulder.x) ? 'LEFT_PROFILE' : 'RIGHT_PROFILE';
    } else if (isFrontal) {
      // Could be front or back. 
      // MediaPipe struggles with Back sometimes, but usually if X(Left) > X(Right) they are facing camera.
      // (Image is mirrored or non-mirrored? Typically x=0 is left of image, so user's left shoulder is on the right side of image if facing camera)
      // Assuming standard non-mirrored raw coords: user facing camera => left shoulder is on the right (higher X).
      if (leftShoulder.x > rightShoulder.x) {
        return 'FRONT';
      } else {
        return 'BACK';
      }
    } else {
      // Between profile and frontal
      if (shoulderZDiff < -0.05) {
        return 'THREE_QUARTER_LEFT';
      } else if (shoulderZDiff > 0.05) {
        return 'THREE_QUARTER_RIGHT';
      }
      return 'FRONT'; // Fallback
    }
  }
}
