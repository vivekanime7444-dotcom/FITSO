import { HapticService } from './HapticService';
import { LandmarkSmoother } from './TemporalFilter';
import { PostureValidator, type PostureState } from './PostureValidator';
import { SkeletonMapper } from './SkeletonMapper';
import { BodyOrientationDetector, type BodyOrientation } from './BodyOrientationDetector';
import { VisibilityEngine } from './VisibilityEngine';
import type { TrackingStatus } from './VisibilityEngine';
import { PushUpAnalyzer } from './analyzers/PushUpAnalyzer';
import { SquatAnalyzer } from './analyzers/SquatAnalyzer';
import { CurlAnalyzer } from './analyzers/CurlAnalyzer';
import { PullUpAnalyzer } from './analyzers/PullUpAnalyzer';
import { RepStateMachine, type RepState } from './RepStateMachine';
import { MovementTracker } from './MovementTracker';

export interface AnalysisResult {
  state: RepState;
  reps: number;
  feedback: string | null;
  confidence: number;
  posture: PostureState;
  orientation: BodyOrientation;
  trackingStatus: TrackingStatus;
  primarySide: string;
  rom: number; // 0-100
}

export class ExerciseAnalysisEngine {
  private static instance: ExerciseAnalysisEngine;
  
  private currentReps = 0;
  private currentExercise: string = '';
  private currentRom = 0;
  
  private smoother = new LandmarkSmoother(0.25);
  private stateMachine = new RepStateMachine();
  private movementTracker = new MovementTracker();
  
  public onRepComplete: ((reps: number) => void) | null = null;
  public onStateChange: ((state: RepState) => void) | null = null;

  private constructor() {
    this.stateMachine.onRepComplete = () => {
      this.currentReps++;
      HapticService.selection();
      if (this.onRepComplete) this.onRepComplete(this.currentReps);
    };
    
    this.stateMachine.onStateChange = (state) => {
      if (this.onStateChange) this.onStateChange(state);
    };
  }

  public static getInstance(): ExerciseAnalysisEngine {
    if (!ExerciseAnalysisEngine.instance) {
      ExerciseAnalysisEngine.instance = new ExerciseAnalysisEngine();
    }
    return ExerciseAnalysisEngine.instance;
  }

  public startExercise(exerciseName: string, _targetReps: number) {
    this.currentExercise = exerciseName.toLowerCase();
    this.currentReps = 0;
    this.currentRom = 0;
    this.smoother.reset();
    this.stateMachine.reset();
    this.movementTracker.reset();
  }

  public processPose(poseResult: any): AnalysisResult {
    const now = performance.now();
    
    const defaultResult: AnalysisResult = {
      state: this.stateMachine.getState(),
      reps: this.currentReps,
      feedback: null,
      confidence: 0,
      posture: 'UNKNOWN',
      orientation: 'UNKNOWN',
      trackingStatus: 'PAUSED',
      primarySide: 'UNKNOWN',
      rom: this.currentRom
    };

    if (!poseResult || !poseResult.landmarks || poseResult.landmarks.length === 0) {
      this.stateMachine.update(false, null, now);
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
    let rom: number | null = null;
    let isPostureValid = false;

    if (this.currentExercise.includes('push-up')) {
      const visibility = VisibilityEngine.evaluatePushUp(frame);
      trackingStatus = visibility.status;
      primarySide = visibility.primarySide;
      isPostureValid = PostureValidator.isReadyForPushUp(frame);
      if (trackingStatus !== 'PAUSED') {
         rom = PushUpAnalyzer.getROM(frame, orientation, visibility);
      }
    } else if (this.currentExercise.includes('squat')) {
      const visibility = VisibilityEngine.evaluateSquat(frame);
      trackingStatus = visibility.status;
      primarySide = visibility.primarySide;
      isPostureValid = PostureValidator.isReadyForSquat(frame);
      if (trackingStatus !== 'PAUSED') {
         rom = SquatAnalyzer.getROM(frame, orientation, visibility);
      }
    } else if (this.currentExercise.includes('curl')) {
      const visibility = VisibilityEngine.evaluateCurl(frame);
      trackingStatus = visibility.status;
      primarySide = visibility.primarySide;
      isPostureValid = PostureValidator.isReadyForCurl(frame);
      if (trackingStatus !== 'PAUSED') {
         rom = CurlAnalyzer.getROM(frame, orientation, visibility);
      }
    } else if (this.currentExercise.includes('pull-up') || this.currentExercise.includes('chin-up')) {
      const visibility = VisibilityEngine.evaluatePullUp(frame);
      trackingStatus = visibility.status;
      primarySide = visibility.primarySide;
      isPostureValid = PostureValidator.isReadyForPullUp(frame);
      if (trackingStatus !== 'PAUSED') {
         rom = PullUpAnalyzer.getROM(frame, orientation, visibility);
      }
    } else {
      trackingStatus = 'PAUSED';
      feedback = "Exercise not supported by position engine.";
    }

    if (rom !== null) {
       this.currentRom = rom;
       const movementData = this.movementTracker.addFrame(frame, rom, now);
       
       if (movementData.isCameraShake) {
          // Camera is shaking, degrade tracking and don't update state machine
          trackingStatus = 'DEGRADED';
          feedback = "Camera Shake Detected";
       } else {
          this.stateMachine.update(isPostureValid, rom, now);
       }
    } else {
       this.stateMachine.update(false, null, now);
    }

    confidence = trackingStatus === 'ACTIVE' ? 0.95 : trackingStatus === 'DEGRADED' ? 0.6 : 0.2;

    return {
      state: this.stateMachine.getState(),
      reps: this.currentReps,
      feedback,
      confidence,
      posture,
      orientation,
      trackingStatus,
      primarySide,
      rom: this.currentRom
    };
  }
}

export const exerciseAnalysisEngine = ExerciseAnalysisEngine.getInstance();
