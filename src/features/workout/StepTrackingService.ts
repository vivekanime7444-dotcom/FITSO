import { useActivityStore } from '../../store/useActivityStore';
import { HapticService } from './HapticService';
import { SystemVoiceService } from './SystemVoiceService';

export class StepTrackingService {
  private static isTracking = false;
  private static hasPermission = false;
  
  // Basic pedometer state
  private static lastZ = 0;
  private static lastPeakTime = 0;
  private static stepThreshold = 1.2; // Acceleration threshold for step detection
  private static motionHandler: ((event: DeviceMotionEvent) => void) | null = null;
  private static goalReachedToday = false;

  public static initialize() {
    useActivityStore.getState().initializeToday();
    // Check if previously permitted in a way we can auto-start
    this.checkPermissionStatus();
  }

  private static async checkPermissionStatus() {
    // If it's a device that doesn't need explicit request (e.g. Android), we can just try to listen
    if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
      this.hasPermission = true;
      // We don't auto-start tracking to save battery, but we mark it as available
    }
  }

  public static get isTrackingActive() {
    return this.isTracking;
  }

  public static get isPermissionGranted() {
    return this.hasPermission;
  }

  public static async requestPermission(): Promise<boolean> {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        if (permissionState === 'granted') {
          this.hasPermission = true;
          return true;
        }
      } catch (e) {
        console.error('Device motion permission error:', e);
      }
      return false;
    } else {
      // Non-iOS devices usually don't need explicit request, just check if sensor exists by listening
      this.hasPermission = true;
      return true;
    }
  }

  public static startTracking() {
    if (this.isTracking) return;
    
    if (!this.hasPermission) {
      SystemVoiceService.init();
      SystemVoiceService.announceExercise(0, 'Activity sensor unavailable. Manual protocol enabled.', 0);
      return;
    }

    this.motionHandler = (event: DeviceMotionEvent) => this.handleMotion(event);
    window.addEventListener('devicemotion', this.motionHandler, true);
    this.isTracking = true;

    HapticService.confirm();
    SystemVoiceService.init();
    
    // Slight delay so the user hears it properly
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance("Activity protocol activated.");
      utterance.pitch = 0.85; 
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }, 500);
  }

  public static stopTracking() {
    if (!this.isTracking || !this.motionHandler) return;
    window.removeEventListener('devicemotion', this.motionHandler, true);
    this.motionHandler = null;
    this.isTracking = false;
  }

  private static handleMotion(event: DeviceMotionEvent) {
    if (!event.accelerationIncludingGravity) return;
    
    const { x, y, z } = event.accelerationIncludingGravity;
    if (x === null || y === null || z === null) return;

    // Very basic peak detection on Z axis (vertical movement while walking/holding phone)
    // A robust step counter would use a low-pass filter and magnitude of vector (sqrt(x*x+y*y+z*z))
    const magnitude = Math.sqrt(x*x + y*y + z*z);
    
    // Normal gravity is ~9.8. Look for peaks above gravity + threshold
    const peakThresh = 9.8 + this.stepThreshold;
    const now = Date.now();

    if (magnitude > peakThresh && this.lastZ <= peakThresh) {
      // It's a peak. Check time since last peak to debounce (e.g. 300ms min between steps)
      if (now - this.lastPeakTime > 300) {
        this.registerStep();
        this.lastPeakTime = now;
      }
    }
    
    this.lastZ = magnitude;
  }

  private static registerStep() {
    const store = useActivityStore.getState();
    const prevSteps = store.dailyActivity?.steps || 0;
    
    store.addSteps(1, 'DEVICE');
    
    const newSteps = store.dailyActivity?.steps || 0;
    const goal = store.stepGoal;

    if (newSteps >= goal && prevSteps < goal && !this.goalReachedToday) {
      this.goalReachedToday = true;
      this.announceGoalReached();
    }
  }

  public static checkAndAnnounceGoal(prevSteps: number, newSteps: number) {
    const goal = useActivityStore.getState().stepGoal;
    if (newSteps >= goal && prevSteps < goal && !this.goalReachedToday) {
      this.goalReachedToday = true;
      this.announceGoalReached();
    }
  }

  private static announceGoalReached() {
    HapticService.confirm();
    setTimeout(() => HapticService.confirm(), 200);
    
    SystemVoiceService.init();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance("Daily activity objective complete.");
      utterance.pitch = 0.85; 
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }, 500);
  }

  // --- DEVELOPMENT MOCKS ---
  public static addMockSteps(amount: number) {
    if (!import.meta.env.DEV) return;
    
    const store = useActivityStore.getState();
    const prevSteps = store.dailyActivity?.steps || 0;
    
    store.addSteps(amount, 'DEVICE');
    
    const newSteps = store.dailyActivity?.steps || 0;
    this.checkAndAnnounceGoal(prevSteps, newSteps);
  }
}
