export interface Landmark {
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0 (0 is top)
  z: number; // roughly relative to hips, negative is closer to camera
  visibility: number;
  confidence: number; // Usually same as visibility in MediaPipe, but we track explicitly
}

export interface SkeletonFrame {
  nose: Landmark | null;
  leftEye: Landmark | null;
  rightEye: Landmark | null;
  leftEar: Landmark | null;
  rightEar: Landmark | null;
  
  leftShoulder: Landmark | null;
  rightShoulder: Landmark | null;
  leftElbow: Landmark | null;
  rightElbow: Landmark | null;
  leftWrist: Landmark | null;
  rightWrist: Landmark | null;
  
  leftHip: Landmark | null;
  rightHip: Landmark | null;
  leftKnee: Landmark | null;
  rightKnee: Landmark | null;
  leftAnkle: Landmark | null;
  rightAnkle: Landmark | null;
  
  leftHeel: Landmark | null;
  rightHeel: Landmark | null;
  leftFootIndex: Landmark | null;
  rightFootIndex: Landmark | null;
}

export class SkeletonMapper {
  private static parseLandmark(point: any): Landmark | null {
    if (!point) return null;
    return {
      x: point.x,
      y: point.y,
      z: point.z,
      visibility: point.visibility || 0,
      confidence: point.visibility || 0, // Fallback confidence to visibility
    };
  }

  public static mapMediaPipe(landmarks: any[]): SkeletonFrame | null {
    if (!landmarks || landmarks.length < 33) return null;

    return {
      nose: this.parseLandmark(landmarks[0]),
      leftEye: this.parseLandmark(landmarks[2]),
      rightEye: this.parseLandmark(landmarks[5]),
      leftEar: this.parseLandmark(landmarks[7]),
      rightEar: this.parseLandmark(landmarks[8]),
      
      leftShoulder: this.parseLandmark(landmarks[11]),
      rightShoulder: this.parseLandmark(landmarks[12]),
      leftElbow: this.parseLandmark(landmarks[13]),
      rightElbow: this.parseLandmark(landmarks[14]),
      leftWrist: this.parseLandmark(landmarks[15]),
      rightWrist: this.parseLandmark(landmarks[16]),
      
      leftHip: this.parseLandmark(landmarks[23]),
      rightHip: this.parseLandmark(landmarks[24]),
      leftKnee: this.parseLandmark(landmarks[25]),
      rightKnee: this.parseLandmark(landmarks[26]),
      leftAnkle: this.parseLandmark(landmarks[27]),
      rightAnkle: this.parseLandmark(landmarks[28]),
      
      leftHeel: this.parseLandmark(landmarks[29]),
      rightHeel: this.parseLandmark(landmarks[30]),
      leftFootIndex: this.parseLandmark(landmarks[31]),
      rightFootIndex: this.parseLandmark(landmarks[32]),
    };
  }
}
