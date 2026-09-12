export class SystemVoice {
  private static synth = window.speechSynthesis;
  private static voice: SpeechSynthesisVoice | null = null;
  private static isInitialized = false;

  public static init() {
    if (!this.synth) return;
    
    // Try to find a good robotic/system sounding voice, usually a clear English female/male voice.
    const setVoice = () => {
      const voices = this.synth.getVoices();
      // Prefer Google UK English Female, or Samantha on Mac, or Microsoft Zira
      this.voice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Samantha') || v.name.includes('Zira')) || voices[0];
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

    this.synth.cancel(); // Cancel any ongoing speech to avoid overlap

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    // System voice characteristics
    utterance.pitch = 0.9;
    utterance.rate = 1.0;
    utterance.volume = 1.0;

    this.synth.speak(utterance);
  }

  public static cancel() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // Pre-defined phrase generators
  public static getPhrases = {
    startWorkout: (protocolName: string) => [
      `${protocolName} initiated.`,
      `Protocol activated.`,
      `Mission starting. Prepare yourself.`
    ],
    startExercise: (exerciseName: string) => [
      `Next exercise: ${exerciseName}. Prepare.`,
      `${exerciseName}. Begin.`
    ],
    startSet: (setNum: number, target: string) => [
      `Set ${setNum}. Target: ${target}.`,
      `Begin set ${setNum}.`
    ],
    setComplete: () => [
      `Set complete. Recovery initiated.`,
      `Good. Set recorded.`,
      `Set complete.`
    ],
    restComplete: () => [
      `Recovery complete. Prepare for the next set.`,
      `Rest complete.`
    ],
    exerciseComplete: () => [
      `Exercise complete.`,
      `Target achieved.`
    ],
    workoutComplete: () => [
      `Mission complete. Training session recorded.`,
      `Protocol finished. Excellent work.`
    ],
    restDay: () => [
      `Recovery protocol active. No training mission scheduled today.`
    ]
  };

  public static getRandomPhrase(phrases: string[]) {
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
}
