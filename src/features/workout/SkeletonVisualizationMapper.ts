import type { Landmark } from './SkeletonMapper';

export interface VisualJoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface SimpleVisualSkeleton {
  head: VisualJoint | null;
  neck: VisualJoint | null;
  leftShoulder: VisualJoint | null;
  rightShoulder: VisualJoint | null;
  leftElbow: VisualJoint | null;
  rightElbow: VisualJoint | null;
  leftWrist: VisualJoint | null;
  rightWrist: VisualJoint | null;
  torso: VisualJoint | null;
  waist: VisualJoint | null;
  leftHip: VisualJoint | null;
  rightHip: VisualJoint | null;
  leftKnee: VisualJoint | null;
  rightKnee: VisualJoint | null;
  leftAnkle: VisualJoint | null;
  rightAnkle: VisualJoint | null;
  leftFoot: VisualJoint | null;
  rightFoot: VisualJoint | null;
}

export class SkeletonVisualizationMapper {
  private smoothedVisuals: any = {};
  private alpha = 0.4; // Smoothing factor (lower = smoother)

  private midpoint(a: Landmark, b: Landmark): VisualJoint | null {
    if (!a || !b) return null;
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      z: (a.z + b.z) / 2,
      visibility: Math.min(a.visibility || 0, b.visibility || 0), // Bottleneck visibility
    };
  }

  private mapPoint(landmark: Landmark | null): VisualJoint | null {
    if (!landmark) return null;
    return {
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
      visibility: landmark.visibility || 0,
    };
  }

  private smoothPoint(key: string, current: VisualJoint | null): VisualJoint | null {
    if (!current) {
      delete this.smoothedVisuals[key];
      return null;
    }

    if (!this.smoothedVisuals[key]) {
      this.smoothedVisuals[key] = { ...current };
      return this.smoothedVisuals[key];
    }

    const prev = this.smoothedVisuals[key];
    this.smoothedVisuals[key] = {
      x: prev.x + this.alpha * (current.x - prev.x),
      y: prev.y + this.alpha * (current.y - prev.y),
      z: prev.z + this.alpha * (current.z - prev.z),
      visibility: prev.visibility + this.alpha * (current.visibility - prev.visibility),
    };

    return this.smoothedVisuals[key];
  }

  public map(rawLandmarks: any[]): SimpleVisualSkeleton | null {
    if (!rawLandmarks || rawLandmarks.length < 33) return null;

    // Use nose for head
    const head = this.mapPoint(rawLandmarks[0]);
    
    const leftShoulder = this.mapPoint(rawLandmarks[11]);
    const rightShoulder = this.mapPoint(rawLandmarks[12]);
    const neck = this.midpoint(rawLandmarks[11], rawLandmarks[12]);

    const leftHip = this.mapPoint(rawLandmarks[23]);
    const rightHip = this.mapPoint(rawLandmarks[24]);
    const waist = this.midpoint(rawLandmarks[23], rawLandmarks[24]);

    let torso: VisualJoint | null = null;
    if (neck && waist) {
      torso = {
        x: (neck.x + waist.x) / 2,
        y: (neck.y + waist.y) / 2,
        z: (neck.z + waist.z) / 2,
        visibility: Math.min(neck.visibility, waist.visibility),
      };
    }

    const skeleton: SimpleVisualSkeleton = {
      head: this.smoothPoint('head', head),
      neck: this.smoothPoint('neck', neck),
      leftShoulder: this.smoothPoint('leftShoulder', leftShoulder),
      rightShoulder: this.smoothPoint('rightShoulder', rightShoulder),
      leftElbow: this.smoothPoint('leftElbow', this.mapPoint(rawLandmarks[13])),
      rightElbow: this.smoothPoint('rightElbow', this.mapPoint(rawLandmarks[14])),
      leftWrist: this.smoothPoint('leftWrist', this.mapPoint(rawLandmarks[15])),
      rightWrist: this.smoothPoint('rightWrist', this.mapPoint(rawLandmarks[16])),
      torso: this.smoothPoint('torso', torso),
      waist: this.smoothPoint('waist', waist),
      leftHip: this.smoothPoint('leftHip', leftHip),
      rightHip: this.smoothPoint('rightHip', rightHip),
      leftKnee: this.smoothPoint('leftKnee', this.mapPoint(rawLandmarks[25])),
      rightKnee: this.smoothPoint('rightKnee', this.mapPoint(rawLandmarks[26])),
      leftAnkle: this.smoothPoint('leftAnkle', this.mapPoint(rawLandmarks[27])),
      rightAnkle: this.smoothPoint('rightAnkle', this.mapPoint(rawLandmarks[28])),
      leftFoot: this.smoothPoint('leftFoot', this.mapPoint(rawLandmarks[31])), // toe
      rightFoot: this.smoothPoint('rightFoot', this.mapPoint(rawLandmarks[32])), // toe
    };

    return skeleton;
  }
}
