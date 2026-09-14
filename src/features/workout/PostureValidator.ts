export type PostureState = 'STANDING' | 'SITTING' | 'HORIZONTAL' | 'UNKNOWN';

export class PostureValidator {
  
  public static classifyPosture(landmarks: any[]): PostureState {
    if (!landmarks || landmarks.length === 0) return 'UNKNOWN';
    
    // 11/12 Shoulders, 23/24 Hips, 27/28 Ankles
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    if (!leftShoulder || !leftHip) return 'UNKNOWN';

    const shoulderY = (leftShoulder.y + (rightShoulder?.y || leftShoulder.y)) / 2;
    const hipY = (leftHip.y + (rightHip?.y || leftHip.y)) / 2;
    
    // In camera coordinates, Y goes DOWN (0 is top, 1 is bottom)
    // Vertical distance between shoulder and hip
    const torsoVerticalDistance = Math.abs(hipY - shoulderY);
    
    // X goes RIGHT (0 is left, 1 is right)
    const shoulderX = (leftShoulder.x + (rightShoulder?.x || leftShoulder.x)) / 2;
    const hipX = (leftHip.x + (rightHip?.x || leftHip.x)) / 2;
    const torsoHorizontalDistance = Math.abs(hipX - shoulderX);

    // 1. Check if user is HORIZONTAL (e.g. push-up/plank position)
    // If the horizontal distance between shoulders and hips is greater than vertical
    if (torsoHorizontalDistance > torsoVerticalDistance * 1.2) {
      return 'HORIZONTAL';
    }

    // Otherwise, they are likely upright. Let's distinguish between standing and sitting based on ankles/knees.
    // If ankles aren't visible or very high confidence, we might default to sitting or unknown.
    if (leftAnkle && leftAnkle.visibility > 0.5) {
      const ankleY = (leftAnkle.y + (rightAnkle?.y || leftAnkle.y)) / 2;
      const legVerticalDistance = Math.abs(ankleY - hipY);
      
      // If legs are long vertically relative to torso, they are standing.
      if (legVerticalDistance > torsoVerticalDistance * 0.8) {
        return 'STANDING';
      } else {
        // If legs are bent up or very short vertically compared to torso, they are sitting.
        return 'SITTING';
      }
    }
    
    // If we can't see ankles, but torso is vertical, they are either standing close to camera or sitting.
    // Without full body context, we lean towards SITTING or UNKNOWN.
    return 'SITTING'; 
  }

  public static isReadyForPushUp(landmarks: any[]): boolean {
    const posture = this.classifyPosture(landmarks);
    if (posture !== 'HORIZONTAL') return false;

    // Further validation for pushup:
    // Shoulders must be visible and roughly at same height as hips or slightly higher,
    // and wrists must be below shoulders (higher Y value).
    const leftShoulder = landmarks[11];
    const leftWrist = landmarks[15];
    
    if (!leftShoulder || !leftWrist) return false;
    
    // Wrists should be "below" shoulders in Y coordinate (meaning higher value in image coords)
    // or at least not way above.
    if (leftWrist.y < leftShoulder.y - 0.1) return false;

    return true;
  }
}
