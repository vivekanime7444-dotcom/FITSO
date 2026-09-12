export class SystemVoice {
  private static synth = window.speechSynthesis;
  private static voice: SpeechSynthesisVoice | null = null;
  private static isInitialized = false;

  public static init() {
    if (!this.synth) return;
    
    const setVoice = () => {
      const voices = this.synth.getVoices();
      if (voices.length === 0) return;

      // Prioritize English Male voices that sound natural/deep
      const enMaleVoices = voices.filter(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('mark') || v.name.toLowerCase().includes('guy')));
      const enVoices = voices.filter(v => v.lang.startsWith('en'));
      
      // Preferred deep voices if available (Google UK English Male, Microsoft David, etc.)
      const preferred = enMaleVoices.find(v => v.name.includes('UK English Male')) || 
                        enMaleVoices.find(v => v.name.includes('David')) ||
                        enMaleVoices[0] ||
                        enVoices[0] ||
                        voices[0];
                        
      this.voice = preferred;
      this.isInitialized = true;
    };

    setVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = setVoice;
    }
  }

  public static speak(text: string, enabled: boolean) {
    if (!enabled || !this.synth) return;
    if (!this.isInitialized) this.init();

    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    // Male system trainer tuning (natural but slightly authoritative and calm)
    utterance.pitch = 0.85; 
    utterance.rate = 0.95;
    utterance.volume = 1.0;

    this.synth.speak(utterance);
  }

  public static cancel() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // Pre-defined phrase generators with correct English sentences
  public static getPhrases = {
    startWorkout: (protocolName: string) => [
      `Training protocol initiated. ${protocolName} activated.`,
    ],
    startExercise: (exerciseNum: number, exerciseName: string) => [
      `Exercise ${exerciseNum}. ${exerciseName}. Prepare.`,
    ],
    startSet: (setNum: number, targetType: 'reps' | 'time', targetAmount: number) => {
      if (targetType === 'reps') {
        return [`Set ${setNum}. Target ${targetAmount} repetitions.`];
      }
      return [`Set ${setNum}. Target ${targetAmount} seconds.`];
    },
    setComplete: () => [
      `Set complete. Recovery protocol initiated.`,
    ],
    restComplete: () => [
      `Recovery complete. Prepare for the next set.`,
    ],
    workoutComplete: () => [
      `Mission complete. Training session recorded.`,
    ],
    restDay: () => [
      `Recovery protocol active. No training mission is scheduled today.`
    ]
  };

  public static getRandomPhrase(phrases: string[]) {
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
}
