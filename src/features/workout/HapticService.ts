export class HapticService {
  private static isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  public static light() {
    if (this.isSupported) navigator.vibrate(10);
  }

  public static medium() {
    if (this.isSupported) navigator.vibrate(20);
  }

  public static selection() {
    if (this.isSupported) navigator.vibrate(5);
  }

  public static confirm() {
    if (this.isSupported) navigator.vibrate([15, 30, 20]);
  }

  public static success() {
    // Distinctive success pattern
    if (this.isSupported) navigator.vibrate([30, 40, 50]);
  }

  public static warning() {
    if (this.isSupported) navigator.vibrate([40, 50, 40]);
  }

  public static error() {
    if (this.isSupported) navigator.vibrate([50, 50, 50, 50, 50]);
  }
}
