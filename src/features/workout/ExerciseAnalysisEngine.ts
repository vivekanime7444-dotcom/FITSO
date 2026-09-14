import { HapticService } from './HapticService';
import { LandmarkSmoother, TemporalValidator } from './TemporalFilter';
import { PostureValidator, type PostureState } from './PostureValidator';

export type RepState = 'NOT_READY' | 'READY' | 'DESCENDING' | 'BOTTOM_CONFIRMED' | 'ASCENDING' | 'TOP_CONFIRMED' | 'REP_COMPLETE';

export interface AnalysisResult {
  state: RepState;
  reps: number;
  feedback: string | null;
  confidence: number;
  posture: PostureState;
}

export class ExerciseAnalysisEngine {
  private static instance: ExerciseAnalysisEngine;
  
  private currentState: RepState = 'NOT_READY';
  private currentReps = 0;
  private currentExercise: string = '';
  
  // Smoothing and Validation
  private smoother = new LandmarkSmoother(0.2); // Heavy smoothing
  private positionValidator = new TemporalValidator(1000); // Must hold READY for 1 second
  private bottomValidator = new TemporalValidator(200);    // Must hold BOTTOM for 200ms
  private topValidator = new TemporalValidator(200);       // Must hold TOP for 200ms
  
  // Callbacks
  public onRepComplete: ((reps: number) => void) | null = null;
  public onStateChange: ((state: RepState) => void) | null = null;

  private constructor() {}

  public static getInstance(): ExerciseAnalysisEngine {
    if (!ExerciseAnalysisEngine.instance) {
      ExerciseAnalysisEngine.instance = new ExerciseAnalysisEngine();
    }
    return ExerciseAnalysisEngine.instance;
  }

  public startExercise(exerciseName: string, _targetReps: number) {
    this.currentExercise = exerciseName.toLowerCase();
    this.currentReps = 0;
    this.currentState = 'NOT_READY';
    this.smoother.reset();
    this.positionValidator.reset();
    this.bottomValidator.reset();
    this.topValidator.reset();
    this.emitState('NOT_READY');
  }

  public processPose(poseResult: any): AnalysisResult {
    if (!poseResult || !poseResult.landmarks || poseResult.landmarks.length === 0) {
      this.positionValidator.reset();
      this.changeState('NOT_READY');
      return { state: this.currentState, reps: this.currentReps, feedback: null, confidence: 0, posture: 'UNKNOWN' };
    }

    const rawLandmarks = poseResult.landmarks[0];
    const confidence = this.calculateTrackingConfidence(rawLandmarks);
    
    if (confidence < 0.5) {
      this.positionValidator.reset();
      // Don't change state immediately, but tracking is poor. We stay in current state but don't advance.
      return { state: this.currentState, reps: this.currentReps, feedback: null, confidence, posture: 'UNKNOWN' };
    }

    const smoothed = this.smoother.smooth(rawLandmarks);
    const posture = PostureValidator.classifyPosture(smoothed);

    let feedback: string | null = null;

    if (this.currentExercise.includes('push-up')) {
      feedback = this.analyzePushup(smoothed);
    } else {
      // Temporarily disable other exercises
      this.changeState('NOT_READY');
      feedback = "Exercise not supported yet in Phase 6 core fix.";
    }

    return {
      state: this.currentState,
      reps: this.currentReps,
      feedback,
      confidence,
      posture
    };
  }

  private calculateTrackingConfidence(landmarks: any[]): number {
    let visible = 0;
    const required = [11, 12, 13, 14, 15, 16, 23, 24]; // Shoulders, elbows, wrists, hips
    for (const idx of required) {
      if (landmarks[idx] && (landmarks[idx].visibility || 1) > 0.5) visible++;
    }
    return visible / required.length;
  }

  private calculateAngle(a: any, b: any, c: any): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return angle;
  }

  private changeState(newState: RepState) {
    if (this.currentState !== newState) {
      this.currentState = newState;
      this.emitState(newState);
    }
  }

  private emitState(state: RepState) {
    if (this.onStateChange) this.onStateChange(state);
  }

  // === STRICT PUSH-UP STATE MACHINE ===

  private analyzePushup(landmarks: any[]): string | null {
    // Requirements for Push-up:
    // 1. Must be HORIZONTAL and valid.
    const isPostureValid = PostureValidator.isReadyForPushUp(landmarks);
    const isReady = this.positionValidator.validate(isPostureValid ? 'VALID' : 'INVALID');

    if (!isReady) {
      this.changeState('NOT_READY');
      this.bottomValidator.reset();
      this.topValidator.reset();
      return null;
    }

    const shoulder = landmarks[11];
    const elbow = landmarks[13];
    const wrist = landmarks[15];

    if (!shoulder || !elbow || !wrist) return null;

    const elbowAngle = this.calculateAngle(shoulder, elbow, wrist);

    switch (this.currentState) {
      case 'NOT_READY':
      case 'REP_COMPLETE':
        // Transition to READY if angle is high (arms extended)
        if (elbowAngle > 150) {
          this.changeState('READY');
        }
        break;

      case 'READY':
        // Start descending
        if (elbowAngle < 140) {
          this.changeState('DESCENDING');
        }
        break;

      case 'DESCENDING':
        // Validate BOTTOM
        if (elbowAngle <= 90) {
          const isBottomConfirmed = this.bottomValidator.validate('BOTTOM');
          if (isBottomConfirmed) {
            this.changeState('BOTTOM_CONFIRMED');
          }
        } else {
          this.bottomValidator.reset();
          // If they go back up without hitting 90, they failed the rep. Return to READY.
          if (elbowAngle > 150) {
            this.changeState('READY');
          }
        }
        break;

      case 'BOTTOM_CONFIRMED':
        // Start ascending
        if (elbowAngle > 100) {
          this.changeState('ASCENDING');
        }
        break;

      case 'ASCENDING':
        // Validate TOP
        if (elbowAngle > 150) {
          const isTopConfirmed = this.topValidator.validate('TOP');
          if (isTopConfirmed) {
            this.changeState('TOP_CONFIRMED');
          }
        } else {
          this.topValidator.reset();
          // If they go back down before hitting top, they failed the ascent.
          if (elbowAngle < 100) {
            this.changeState('DESCENDING');
          }
        }
        break;

      case 'TOP_CONFIRMED':
        // Only here can we increment the rep
        this.currentReps++;
        this.changeState('REP_COMPLETE');
        HapticService.selection();
        if (this.onRepComplete) this.onRepComplete(this.currentReps);
        break;
    }

    return null;
  }
}

export const exerciseAnalysisEngine = ExerciseAnalysisEngine.getInstance();
