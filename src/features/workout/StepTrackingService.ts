import { useActivityStore } from '../../store/useActivityStore';
import { HapticService } from './HapticService';
import { SystemVoiceService } from './SystemVoiceService';

export interface ActivityProvider {
  isSupported(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  getPermissionStatus(): Promise<string>;
  getTodaySteps(): Promise<number>;
  getHistoricalSteps(startDate: string, endDate: string): Promise<Record<string, number>>;
  startSyncListener(onUpdate: (steps: number) => void): void;
  getSourceName(): string;
}

class WebActivityProvider implements ActivityProvider {
  async isSupported(): Promise<boolean> {
    // Browsers do not have a native background step API
    return false;
  }
  
  async requestPermission(): Promise<boolean> {
    return false;
  }

  async getPermissionStatus(): Promise<string> {
    return 'UNAVAILABLE';
  }

  async getTodaySteps(): Promise<number> {
    return 0;
  }

  async getHistoricalSteps(): Promise<Record<string, number>> {
    return {};
  }

  startSyncListener(): void {
    // No-op for web
  }

  getSourceName(): string {
    return 'WEB_UNSUPPORTED';
  }
}

export class StepTrackingService {
  private static provider: ActivityProvider = new WebActivityProvider();
  private static isInitialized = false;
  private static goalReachedToday = false;
  private static currentStatus = 'INITIALIZING';

  public static async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Detect if we are in a Native wrapper in the future (e.g. window.Capacitor)
    // if (window.Capacitor?.isNativePlatform()) {
    //    this.provider = new NativeActivityProvider();
    // }

    const supported = await this.provider.isSupported();
    
    useActivityStore.getState().initializeToday(this.provider.getSourceName());

    if (!supported) {
      this.currentStatus = 'DEVICE STEP SENSOR NOT ACCESSIBLE';
      return;
    }

    const permission = await this.provider.getPermissionStatus();
    if (permission === 'GRANTED') {
      this.currentStatus = 'TRACKING ACTIVE';
      await this.sync();
      this.provider.startSyncListener((steps) => this.handleStepsUpdate(steps));
    } else {
      this.currentStatus = 'PERMISSION REQUIRED';
    }
  }

  public static get status() {
    return this.currentStatus;
  }

  public static get source() {
    return this.provider.getSourceName();
  }

  public static async requestPermission() {
    const granted = await this.provider.requestPermission();
    if (granted) {
      this.currentStatus = 'TRACKING ACTIVE';
      await this.sync();
      this.provider.startSyncListener((steps) => this.handleStepsUpdate(steps));
    } else {
      this.currentStatus = 'PERMISSION DENIED';
    }
    return granted;
  }

  public static async sync() {
    const supported = await this.provider.isSupported();
    if (!supported) return;

    try {
      const todaySteps = await this.provider.getTodaySteps();
      this.handleStepsUpdate(todaySteps);

      // Simple historical sync for the past 7 days
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const startStr = d.toISOString().split('T')[0];
      const endStr = new Date().toISOString().split('T')[0];
      
      const history = await this.provider.getHistoricalSteps(startStr, endStr);
      if (Object.keys(history).length > 0) {
        useActivityStore.getState().overwriteHistory(history, this.provider.getSourceName());
      }
    } catch (e) {
      console.error('Failed to sync activity data:', e);
    }
  }

  private static handleStepsUpdate(steps: number) {
    const store = useActivityStore.getState();
    const prevTotal = store.dailyActivity?.totalSteps || 0;
    
    store.syncAutomaticSteps(steps, this.provider.getSourceName());
    
    const newTotal = store.dailyActivity?.totalSteps || 0;
    const goal = store.stepGoal;

    if (newTotal >= goal && prevTotal < goal && !this.goalReachedToday) {
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
    const currentAuto = store.dailyActivity?.automaticSteps || 0;
    
    this.handleStepsUpdate(currentAuto + amount);
  }
}
