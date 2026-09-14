export class SystemVoiceService {
  private static synth = window.speechSynthesis;
  private static voice: SpeechSynthesisVoice | null = null;
  private static isInitialized = false;
  private static enabled = true;
  
  // The core concept for Phase 2: protecting against ghost voice events
  private static currentSessionId: string | null = null;
  private static scheduledTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  public static init() {
    if (!this.synth) return;
    
    const setVoice = () => {
      const voices = this.synth.getVoices();
      if (voices.length === 0) return;

      const maleKeywords = ['male', 'david', 'mark', 'guy', 'daniel', 'arthur', 'gordon', 'aaron', 'fred', 'ralph', 'bruce', 'alex', 'oliver', 'james', 'william', 'george', 'ryan', 'martin', 'brian', 'edward', 'reed', 'rocko'];
      const femaleKeywords = ['female', 'samantha', 'karen', 'victoria', 'moira', 'tessa', 'siri', 'amelia', 'fiona', 'marie', 'kathy', 'agnes', 'zara', 'grace', 'nicola', 'catherine', 'martha', 'luciana', 'monica', 'paulina', 'melina', 'flo', 'grandma'];

      const isMale = (v: SpeechSynthesisVoice) => maleKeywords.some(k => v.name.toLowerCase().includes(k));
      const isFemale = (v: SpeechSynthesisVoice) => femaleKeywords.some(k => v.name.toLowerCase().includes(k));

      const enVoices = voices.filter(v => v.lang.startsWith('en'));
      const enMaleVoices = enVoices.filter(isMale);
      const enNeutralVoices = enVoices.filter(v => !isMale(v) && !isFemale(v));
      
      const preferred = enMaleVoices.find(v => v.name.includes('UK English Male')) || 
                        enMaleVoices.find(v => v.name.includes('David')) ||
                        enMaleVoices.find(v => v.name.includes('Daniel')) ||
                        enMaleVoices.find(v => v.name.includes('Arthur')) ||
                        enMaleVoices[0] ||
                        enNeutralVoices[0] ||
                        enVoices[0] ||
                        voices[0];
                        
      this.voice = preferred || null;
      this.isInitialized = true;
    };

    setVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = setVoice;
    }
  }

  public static setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  // --- SESSION CONTROL ---

  public static startSession(sessionId: string) {
    this.currentSessionId = sessionId;
    if (!this.isInitialized) {
      this.init();
    }
    this.stop(); // Clear anything currently playing
  }

  public static endSession() {
    this.currentSessionId = null;
    this.stop();
  }

  public static stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    // Clear all pending scheduled speech events
    this.scheduledTimeouts.forEach(clearTimeout);
    this.scheduledTimeouts.clear();
  }

  // Core internal method that guarantees speech only happens if session is active
  private static speakGuarded(sessionId: string, text: string) {
    if (!this.enabled || !this.synth) return;
    
    // Critical Protection: Discard if session changed or closed
    if (this.currentSessionId !== sessionId) {
      console.warn(`[SystemVoiceService] Discarding voice event for closed session: ${sessionId}`);
      return; 
    }

    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    utterance.pitch = 0.85; 
    utterance.rate = 0.95;
    utterance.volume = 1.0;

    this.synth.speak(utterance);
  }

  // Delays a speech event while keeping session ID protection
  private static scheduleSpeech(text: string, delayMs: number) {
    if (!this.currentSessionId || !this.enabled) return;
    
    const capturedSessionId = this.currentSessionId;
    
    if (delayMs <= 0) {
      this.speakGuarded(capturedSessionId, text);
      return;
    }

    const timeoutId = setTimeout(() => {
      this.scheduledTimeouts.delete(timeoutId);
      this.speakGuarded(capturedSessionId, text);
    }, delayMs);
    
    this.scheduledTimeouts.add(timeoutId);
  }


  // --- ANNOUNCEMENTS ---

  public static announceMissionStart(protocolName: string, delayMs = 0) {
    this.scheduleSpeech(`Training protocol initiated. ${protocolName} activated.`, delayMs);
  }

  public static announceTrainingDay(protocolName: string, delayMs = 0) {
    this.scheduleSpeech(`${protocolName} protocol activated.`, delayMs);
  }

  public static announceExercise(exerciseNum: number, exerciseName: string, delayMs = 0) {
    this.scheduleSpeech(`Exercise ${exerciseNum}. ${exerciseName}. Prepare.`, delayMs);
  }

  public static announceSet(setNum: number, targetType: 'reps' | 'time', targetAmount: number, delayMs = 0) {
    const text = targetType === 'reps' 
      ? `Set ${setNum}. Target ${targetAmount} repetitions.`
      : `Set ${setNum}. Target ${targetAmount} seconds.`;
    this.scheduleSpeech(text, delayMs);
  }

  public static announceRest(delayMs = 0) {
    this.scheduleSpeech(`Set complete. Recovery protocol initiated.`, delayMs);
  }

  public static announceRestComplete(delayMs = 0) {
    this.scheduleSpeech(`Recovery complete. Prepare for the next set.`, delayMs);
  }

  public static announceWorkoutComplete(delayMs = 0) {
    this.scheduleSpeech(`Mission complete. Training session recorded.`, delayMs);
  }

  public static announceMissionComplete(delayMs = 0) {
    this.scheduleSpeech("Mission complete. Excellent work today.", delayMs);
  }

  public static announceCustom(message: string, delayMs = 0) {
    this.scheduleSpeech(message, delayMs);
  }

  public static announceFormCorrection(message: string, delayMs = 0) {
    // PREPARED FOR PHASE 3
    this.scheduleSpeech(message, delayMs);
  }
}
