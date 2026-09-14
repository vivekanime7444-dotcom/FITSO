import { SystemVoiceService } from './SystemVoiceService';
import { HapticService } from './HapticService';

export type RepState = 'IDLE' | 'READY' | 'DOWN' | 'UP' | 'REP_COMPLETE';

export interface AnalysisResult {
  state: RepState;
  reps: number;
  feedback: string | null;
  confidence: number;
}

export class ExerciseAnalysisEngine {
  private static instance: ExerciseAnalysisEngine;
  
  private currentState: RepState = 'IDLE';
  private currentReps = 0;
  private currentExercise: string = '';
  
  private lastFeedbackTime = 0;
  private feedbackCooldown = 3000; // ms
  
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
    this.currentState = 'IDLE';
    this.lastFeedbackTime = 0;
    this.emitState('IDLE');
  }

  public processPose(poseResult: any): AnalysisResult {
    if (!poseResult || !poseResult.landmarks || poseResult.landmarks.length === 0) {
      return { state: this.currentState, reps: this.currentReps, feedback: null, confidence: 0 };
    }

    const landmarks = poseResult.landmarks[0];
    
    // Default confidence based on visibility of key points (hips, shoulders, knees)
    const confidence = this.calculateTrackingConfidence(landmarks);
    if (confidence < 0.4) {
      return { state: this.currentState, reps: this.currentReps, feedback: null, confidence };
    }

    let feedback: string | null = null;

    // Route to specific exercise logic
    if (this.currentExercise.includes('push-up')) {
      feedback = this.analyzePushup(landmarks);
    } else if (this.currentExercise.includes('squat')) {
      feedback = this.analyzeSquat(landmarks);
    } else if (this.currentExercise.includes('lunge')) {
      feedback = this.analyzeLunge(landmarks);
    } else if (this.currentExercise.includes('curl')) {
      feedback = this.analyzeBicepCurl(landmarks);
    } else {
      // Unsupported exercise, we stay IDLE.
      this.changeState('IDLE');
    }

    return {
      state: this.currentState,
      reps: this.currentReps,
      feedback,
      confidence
    };
  }

  private calculateTrackingConfidence(landmarks: any[]): number {
    let visible = 0;
    const required = [11, 12, 23, 24]; // Shoulders and hips usually needed
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

  private provideFeedback(msg: string) {
    const now = Date.now();
    if (now - this.lastFeedbackTime > this.feedbackCooldown) {
      this.lastFeedbackTime = now;
      SystemVoiceService.announceCustom(msg);
      return msg;
    }
    return null;
  }

  // === EXERCISE SPECIFIC LOGIC ===

  private analyzeSquat(landmarks: any[]): string | null {
    // MediaPipe landmarks: 23=L hip, 25=L knee, 27=L ankle
    const hip = landmarks[23];
    const knee = landmarks[25];
    const ankle = landmarks[27];
    const shoulder = landmarks[11];

    if (!hip || !knee || !ankle || !shoulder) return null;

    const kneeAngle = this.calculateAngle(hip, knee, ankle);
    const backAngle = this.calculateAngle(shoulder, hip, knee);

    if (this.currentState === 'IDLE' || this.currentState === 'REP_COMPLETE') {
      if (kneeAngle > 160) this.changeState('READY');
    }

    if (this.currentState === 'READY' || this.currentState === 'UP') {
      if (kneeAngle < 140 && kneeAngle > 100) {
        this.changeState('DOWN');
      } else if (kneeAngle <= 100) {
        // Deep enough
        this.changeState('DOWN');
      }
    }

    if (this.currentState === 'DOWN') {
      if (kneeAngle <= 100) {
        // Good depth
        if (backAngle < 50) {
          return this.provideFeedback("Keep your chest up");
        }
      }
      
      if (kneeAngle > 150) {
        // Came back up
        // Did they go deep enough? We should technically track max depth, but for simplicity:
        this.currentReps++;
        this.changeState('REP_COMPLETE');
        HapticService.selection();
        if (this.onRepComplete) this.onRepComplete(this.currentReps);
      }
    }

    return null;
  }

  private analyzePushup(landmarks: any[]): string | null {
    // 11=L shoulder, 13=L elbow, 15=L wrist
    const shoulder = landmarks[11];
    const elbow = landmarks[13];
    const wrist = landmarks[15];

    if (!shoulder || !elbow || !wrist) return null;

    const elbowAngle = this.calculateAngle(shoulder, elbow, wrist);

    if (this.currentState === 'IDLE' || this.currentState === 'REP_COMPLETE') {
      if (elbowAngle > 150) this.changeState('READY');
    }

    if (this.currentState === 'READY' || this.currentState === 'UP') {
      if (elbowAngle < 140) {
        this.changeState('DOWN');
      }
    }

    if (this.currentState === 'DOWN') {
      if (elbowAngle <= 90) {
        // Good depth
      }
      
      if (elbowAngle > 150) {
        this.currentReps++;
        this.changeState('REP_COMPLETE');
        HapticService.selection();
        if (this.onRepComplete) this.onRepComplete(this.currentReps);
      }
    }

    return null;
  }

  private analyzeLunge(landmarks: any[]): string | null {
    // Simplified logic
    return this.analyzeSquat(landmarks);
  }

  private analyzeBicepCurl(landmarks: any[]): string | null {
    const shoulder = landmarks[11];
    const elbow = landmarks[13];
    const wrist = landmarks[15];
    if (!shoulder || !elbow || !wrist) return null;
    const elbowAngle = this.calculateAngle(shoulder, elbow, wrist);

    if (this.currentState === 'IDLE' || this.currentState === 'REP_COMPLETE') {
      if (elbowAngle > 150) this.changeState('READY');
    }
    if (this.currentState === 'READY' || this.currentState === 'DOWN') {
      if (elbowAngle < 60) this.changeState('UP');
    }
    if (this.currentState === 'UP') {
      if (elbowAngle > 150) {
        this.currentReps++;
        this.changeState('REP_COMPLETE');
        HapticService.selection();
        if (this.onRepComplete) this.onRepComplete(this.currentReps);
      }
    }
    return null;
  }
}

export const exerciseAnalysisEngine = ExerciseAnalysisEngine.getInstance();
