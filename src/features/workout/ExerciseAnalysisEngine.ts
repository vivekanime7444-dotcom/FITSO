import { HapticService } from './HapticService';
import { LandmarkSmoother, TemporalValidator } from './TemporalFilter';
import { PostureValidator, type PostureState } from './PostureValidator';
import { SkeletonMapper } from './SkeletonMapper';
import type { SkeletonFrame } from './SkeletonMapper';
import { BodyOrientationDetector } from './BodyOrientationDetector';
import type { BodyOrientation } from './BodyOrientationDetector';
import { VisibilityEngine } from './VisibilityEngine';
import type { TrackingStatus } from './VisibilityEngine';
import { PushUpAnalyzer } from './analyzers/PushUpAnalyzer';
import { SquatAnalyzer } from './analyzers/SquatAnalyzer';

export type RepState = 'NOT_READY' | 'READY' | 'DESCENDING' | 'BOTTOM_CONFIRMED' | 'ASCENDING' | 'TOP_CONFIRMED' | 'REP_COMPLETE';

export interface AnalysisResult {
  state: RepState;
  reps: number;
  feedback: string | null;
  confidence: number;
  posture: PostureState;
  orientation: BodyOrientation;
  trackingStatus: TrackingStatus;
  primarySide: string;
}

export class ExerciseAnalysisEngine {
  private static instance: ExerciseAnalysisEngine;
  
  private currentState: RepState = 'NOT_READY';
  private currentReps = 0;
  private currentExercise: string = '';
  
  // Smoothing and Validation
  private smoother = new LandmarkSmoother(0.2); // Heavy smoothing
  private positionValidator = new TemporalValidator(800);  // Must hold READY for 800ms
  private bottomValidator = new TemporalValidator(150);    // Must hold BOTTOM for 150ms
  private topValidator = new TemporalValidator(150);       // Must hold TOP for 150ms
  
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
    const defaultResult: AnalysisResult = {
      state: this.currentState,
      reps: this.currentReps,
      feedback: null,
      confidence: 0,
      posture: 'UNKNOWN',
      orientation: 'UNKNOWN',
      trackingStatus: 'PAUSED',
      primarySide: 'UNKNOWN'
    };

    if (!poseResult || !poseResult.landmarks || poseResult.landmarks.length === 0) {
      this.positionValidator.reset();
      this.changeState('NOT_READY');
      return defaultResult;
    }

    const rawLandmarks = poseResult.landmarks[0];
    const smoothedRaw = this.smoother.smooth(rawLandmarks);
    const frame = SkeletonMapper.mapMediaPipe(smoothedRaw);

    if (!frame) return defaultResult;

    const orientation = BodyOrientationDetector.detect(frame);
    const posture = PostureValidator.classifyPosture(frame);

    let feedback: string | null = null;
    let trackingStatus: TrackingStatus = 'ACTIVE';
    let primarySide = 'BOTH';
    let confidence = 0;

    if (this.currentExercise.includes('push-up')) {
      const visibility = VisibilityEngine.evaluatePushUp(frame);
      trackingStatus = visibility.status;
      primarySide = visibility.primarySide;
      this.analyzePushup(frame, orientation, visibility);
    } else if (this.currentExercise.includes('squat')) {
      const visibility = VisibilityEngine.evaluateSquat(frame);
      trackingStatus = visibility.status;
      primarySide = visibility.primarySide;
      this.analyzeSquat(frame, orientation, visibility);
    } else {
      // Temporarily disable others
      this.changeState('NOT_READY');
      feedback = "Exercise not supported yet in Phase 6 core fix.";
      trackingStatus = 'PAUSED';
    }

    // Estimate confidence based on tracking status for the UI
    confidence = trackingStatus === 'ACTIVE' ? 0.9 : trackingStatus === 'DEGRADED' ? 0.6 : 0.2;

    return {
      state: this.currentState,
      reps: this.currentReps,
      feedback,
      confidence,
      posture,
      orientation,
      trackingStatus,
      primarySide
    };
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

  // === MULTI-VIEW PUSH-UP ENGINE ===
  private analyzePushup(frame: SkeletonFrame, orientation: BodyOrientation, visibility: any) {
    if (visibility.status === 'PAUSED') return;

    const isPostureValid = PostureValidator.isReadyForPushUp(frame);
    const isReady = this.positionValidator.validate(isPostureValid ? 'VALID' : 'INVALID');

    if (!isReady) {
      this.changeState('NOT_READY');
      this.bottomValidator.reset();
      this.topValidator.reset();
      return;
    }

    const metricAngle = PushUpAnalyzer.getPrimaryMetric(frame, orientation, visibility);
    if (metricAngle === null) return;

    switch (this.currentState) {
      case 'NOT_READY':
      case 'REP_COMPLETE':
        if (metricAngle > 150) this.changeState('READY');
        break;
      case 'READY':
        if (metricAngle < 140) this.changeState('DESCENDING');
        break;
      case 'DESCENDING':
        if (metricAngle <= 90) {
          if (this.bottomValidator.validate('BOTTOM')) this.changeState('BOTTOM_CONFIRMED');
        } else {
          this.bottomValidator.reset();
          if (metricAngle > 150) this.changeState('READY');
        }
        break;
      case 'BOTTOM_CONFIRMED':
        if (metricAngle > 100) this.changeState('ASCENDING');
        break;
      case 'ASCENDING':
        if (metricAngle > 150) {
          if (this.topValidator.validate('TOP')) this.changeState('TOP_CONFIRMED');
        } else {
          this.topValidator.reset();
          if (metricAngle < 100) this.changeState('DESCENDING');
        }
        break;
      case 'TOP_CONFIRMED':
        this.currentReps++;
        this.changeState('REP_COMPLETE');
        HapticService.selection();
        if (this.onRepComplete) this.onRepComplete(this.currentReps);
        break;
    }
  }

  // === MULTI-VIEW SQUAT ENGINE ===
  private analyzeSquat(frame: SkeletonFrame, orientation: BodyOrientation, visibility: any) {
    if (visibility.status === 'PAUSED') return;

    const isPostureValid = PostureValidator.isReadyForSquat(frame);
    const isReady = this.positionValidator.validate(isPostureValid ? 'VALID' : 'INVALID');

    if (!isReady) {
      this.changeState('NOT_READY');
      this.bottomValidator.reset();
      this.topValidator.reset();
      return;
    }

    const metricAngle = SquatAnalyzer.getPrimaryMetric(frame, orientation, visibility);
    if (metricAngle === null) return;

    switch (this.currentState) {
      case 'NOT_READY':
      case 'REP_COMPLETE':
        if (metricAngle > 160) this.changeState('READY'); // Standing straight
        break;
      case 'READY':
        if (metricAngle < 150) this.changeState('DESCENDING');
        break;
      case 'DESCENDING':
        // Bottom of squat (90 degrees or lower)
        if (metricAngle <= 100) {
          if (this.bottomValidator.validate('BOTTOM')) this.changeState('BOTTOM_CONFIRMED');
        } else {
          this.bottomValidator.reset();
          if (metricAngle > 160) this.changeState('READY');
        }
        break;
      case 'BOTTOM_CONFIRMED':
        if (metricAngle > 110) this.changeState('ASCENDING');
        break;
      case 'ASCENDING':
        if (metricAngle > 160) {
          if (this.topValidator.validate('TOP')) this.changeState('TOP_CONFIRMED');
        } else {
          this.topValidator.reset();
          if (metricAngle < 110) this.changeState('DESCENDING');
        }
        break;
      case 'TOP_CONFIRMED':
        this.currentReps++;
        this.changeState('REP_COMPLETE');
        HapticService.selection();
        if (this.onRepComplete) this.onRepComplete(this.currentReps);
        break;
    }
  }
}

export const exerciseAnalysisEngine = ExerciseAnalysisEngine.getInstance();
